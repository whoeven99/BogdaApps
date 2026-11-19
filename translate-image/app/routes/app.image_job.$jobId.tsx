import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { BlockStack, InlineStack, Page, Text } from "@shopify/polaris";
import { Table } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatAppI18nNumber } from "~/lib/appI18nRtl";
import { authenticate } from "~/shopify.server";
import { getContentImageJobDetail } from "~/server/contentImage/contentImageJobs.server";
import { loadAdminShopLocales } from "~/server/contentImage/switcherImages.server";
import AppButton from "~/ui/components/AppButton";
import AppPageHeader from "~/ui/components/AppPageHeader";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import AppSubpageTitleBar, { useAppHomeBackAction } from "~/ui/components/AppSubpageTitleBar";
import listStyles from "~/ui/styles/appListPage.module.css";
import { ImageJobMiniStageTrack, StatusTag } from "~/routes/app.translate-v4/components/V4JobCardParts";
import ContentImageCompareModal from "~/routes/component/contentImage/components/ContentImageCompareModal";
import {
  controlContentImageJob,
  fetchJobDetail,
  imageJobKindLabelKey,
  imageListPath,
  isActiveJob,
  type ContentImageJobDetail,
  type ContentImageJobItem,
} from "~/routes/component/contentImage/contentImageClient";
import { imageJobProcessedCount } from "~/routes/component/contentImage/imageJobProgress";
import {
  imageJobMiniStageTrackLabels,
  imageJobStageSummary,
  imageJobStatusForTag,
  imageJobStatusLabel,
} from "~/routes/component/contentImage/imageJobQueueDisplay";
import { translateImageTranslateError } from "~/lib/imageTranslateFeedback";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const jobId = params.jobId ?? "";
  const [locales, detail] = await Promise.all([
    loadAdminShopLocales(admin).catch(() => []),
    getContentImageJobDetail(session.shop, jobId),
  ]);
  const targets = locales
    .filter((row) => !row.primary)
    .map((row) => ({ value: row.locale, label: row.name || row.locale }));
  return json({ targets, detail });
};

const POLL_MS = 5_000;

function ItemStatusBadge({ item }: { item: ContentImageJobItem }) {
  const { t } = useTranslation();
  if (item.status === "DONE") return null;
  if (item.status === "FAILED") {
    return <AppStatusBadge tone="critical">{t("contentImage.item.FAILED")}</AppStatusBadge>;
  }
  if (item.status === "SKIPPED") {
    return <AppStatusBadge tone="neutral">{t("contentImage.item.SKIPPED")}</AppStatusBadge>;
  }
  return <AppStatusBadge tone="info">{t("contentImage.item.PENDING")}</AppStatusBadge>;
}

export default function ImageJobResultPage() {
  const data = useLoaderData<typeof loader>();
  const { t, i18n } = useTranslation();
  const [detail, setDetail] = useState<ContentImageJobDetail | null>(
    data.detail as ContentImageJobDetail | null,
  );
  const [controlBusy, setControlBusy] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<ContentImageJobItem | null>(null);

  const refresh = useCallback(async () => {
    if (!detail?.id) return;
    const next = await fetchJobDetail(detail.id);
    if (next) setDetail(next);
  }, [detail?.id]);

  useEffect(() => {
    if (!isActiveJob(detail)) return;
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [detail, refresh]);

  const listPath = detail
    ? imageListPath(detail.kind, detail.targetLanguage)
    : "/app";
  const backAction = useAppHomeBackAction(listPath, t("Home"));
  const languageLabel = detail
    ? data.targets.find((row) => row.value === detail.targetLanguage)?.label ??
      detail.targetLanguage
    : "";
  const fmt = (n: number) => formatAppI18nNumber(n, i18n.language);

  const runControl = async (intent: "pause" | "resume" | "cancel") => {
    if (!detail) return;
    setControlBusy(intent);
    const res = await controlContentImageJob(detail.id, intent);
    setControlBusy(null);
    if (res.success && res.response) {
      setDetail({ ...detail, ...res.response, items: detail.items });
    } else {
      shopify.toast.show(t("Image translation failed"), { isError: true });
    }
  };

  const columns = useMemo(() => {
    if (!detail) return [];
    return [
      {
        title: t("contentImage.jobResult.column.preview"),
        key: "preview",
        render: (_: unknown, item: ContentImageJobItem) => {
          const clickable = Boolean(item.imageAfterUrl);
          return (
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && setViewItem(item)}
              className={listStyles.jobResultPreviewBtn}
            >
              <div className={listStyles.jobResultPreviewPair}>
                <img className={listStyles.imageThumb} src={`${item.imageUrl}?width=120`} alt="" />
                {item.imageAfterUrl ? (
                  <img className={listStyles.imageThumb} src={`${item.imageAfterUrl}?width=120`} alt="" />
                ) : (
                  <span className={listStyles.jobResultPreviewPlaceholder} aria-hidden />
                )}
              </div>
              {item.resourceTitle ? (
                <span className={listStyles.jobResultPreviewCaption}>{item.resourceTitle}</span>
              ) : null}
            </button>
          );
        },
      },
      {
        title: t("contentImage.column.status"),
        key: "status",
        width: 140,
        render: (_: unknown, item: ContentImageJobItem) => (
          <div className={listStyles.jobResultStatusCell}>
            <ItemStatusBadge item={item} />
            {item.status === "FAILED" && item.error ? (
              <Text as="p" variant="bodySm" tone="critical">
                {translateImageTranslateError(item.error, t)}
              </Text>
            ) : null}
          </div>
        ),
      },
    ];
  }, [detail, t]);

  if (!detail) {
    return (
      <Page>
        <Text as="p">{t("contentImage.jobResult.missing")}</Text>
      </Page>
    );
  }

  const pageTitle = t("contentImage.job.title", {
    kind: t(imageJobKindLabelKey(detail.kind)),
    language: languageLabel || detail.targetLanguage,
  });
  const processed = imageJobProcessedCount(detail);
  const active = isActiveJob(detail);
  const statusLabel = imageJobStatusLabel(detail, t);
  const stageSummary = imageJobStageSummary(detail, t);
  const miniStageSegments = imageJobMiniStageTrackLabels(detail, t);
  const headerExtra = (
    <InlineStack gap="200" wrap={false}>
      {active ? (
        <>
          {detail.status === "PAUSED" ? (
            <AppButton size="small" loading={controlBusy === "resume"} onClick={() => void runControl("resume")}>
              {t("v4.tasks.resume")}
            </AppButton>
          ) : (
            <AppButton size="small" loading={controlBusy === "pause"} onClick={() => void runControl("pause")}>
              {t("v4.tasks.pause")}
            </AppButton>
          )}
          {detail.status !== "PAUSED" ? (
            <AppButton
              type="text"
              size="small"
              danger
              loading={controlBusy === "cancel"}
              onClick={() => void runControl("cancel")}
            >
              {t("v4.tasks.cancelTask")}
            </AppButton>
          ) : null}
        </>
      ) : null}
    </InlineStack>
  );

  return (
    <>
      <AppSubpageTitleBar title={pageTitle} parentUrl={listPath} />
      <Page>
        <BlockStack gap="400">
          <AppPageHeader
            title={pageTitle}
            titleMeta={<StatusTag status={imageJobStatusForTag(detail.status)} label={statusLabel} />}
            backAction={backAction}
            extra={headerExtra}
          />
          <Text as="p" variant="bodySm" tone="subdued">
            {t("contentImage.jobResult.summaryLine", {
              done: processed,
              total: detail.total,
              credits: fmt(detail.creditsUsed),
            })}
            {detail.failed > 0 ? ` · ${t("contentImage.job.failed", { count: detail.failed })}` : ""}
          </Text>
          <div className={listStyles.jobProgressCard}>
            {stageSummary ? <p className={listStyles.jobProgressCardMeta}>{stageSummary}</p> : null}
            <ImageJobMiniStageTrack segments={miniStageSegments} />
          </div>
          <Table<ContentImageJobItem>
            className={listStyles.listTable}
            rowKey="id"
            dataSource={detail.items}
            columns={columns}
            pagination={false}
            locale={{
              emptyText: (
                <span className={listStyles.emptyHint}>{t("contentImage.jobResult.emptyItems")}</span>
              ),
            }}
          />
        </BlockStack>
      </Page>
      <ContentImageCompareModal
        open={Boolean(viewItem?.imageAfterUrl)}
        originalUrl={viewItem?.imageUrl ?? ""}
        translatedUrl={viewItem?.imageAfterUrl ?? ""}
        onClose={() => setViewItem(null)}
      />
    </>
  );
}
