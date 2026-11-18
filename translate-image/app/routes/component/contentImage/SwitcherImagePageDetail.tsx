import { useLoaderData, useParams } from "@remix-run/react";
import { BlockStack, Page, Text } from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useState } from "react";
import { openCreditsPurchaseModal } from "~/utils/creditsPurchaseModal";
import { buildImageTranslateCreditsPurchaseContext } from "~/utils/creditsPurchaseTaskContext";
import { useTranslation } from "react-i18next";
import { formatAppI18nNumber } from "~/lib/appI18nRtl";
import {
  decodeSwitcherPagePathParam,
  displaySwitcherPagePath,
  switcherImageListPath,
} from "~/lib/switcherPagePath";
import { FilesAccessBanner } from "~/lib/FilesAccessBanner";
import {
  DEFAULT_IMAGE_TRANSLATE_MODEL,
  IMAGE_TRANSLATE_MODELS,
  imageTranslateModelOptions,
} from "~/lib/imageTranslate";
import { AppSModal } from "~/ui/components/AppSModal";
import AppPageHeader from "~/ui/components/AppPageHeader";
import AppSectionCard from "~/ui/components/AppSectionCard";
import AppSubpageTitleBar, { useAppHomeBackAction } from "~/ui/components/AppSubpageTitleBar";
import listStyles from "~/ui/styles/appListPage.module.css";
import ContentImageTable from "./components/ContentImageTable";
import ContentImageConfirmModal from "./components/ContentImageConfirmModal";
import ContentImageCompareModal from "./components/ContentImageCompareModal";
import { ImageManageListShell } from "./components/ImageManageListShell";
import { ImageManageToolbar } from "./components/ImageManageToolbar";
import { useContentImageJob } from "./useContentImageJob";
import { useImageRowLiveStatus } from "./useImageRowLiveStatus";
import { useRecentImageFailures } from "./useRecentImageFailures";
import { ImagePageJobSection } from "./components/ImagePageJobSection";
import { ImageTranslationFailureHint } from "./components/ImageTranslationFailureHint";
import { useContentImageActions } from "./useContentImageActions";
import { useBatchTranslate } from "./useBatchTranslate";
import { useSwitcherPageImages } from "./useSwitcherPageImages";
import { imageRowKey, type ContentImageRow } from "./contentImageClient";
import type { ImageManageShellData } from "./ImageResourceListPage";
import { useImageTranslateQuotaOffer } from "./useImageTranslateQuotaOffer";
import { startViewImageTranslate } from "./startViewImageTranslate";

export default function SwitcherImagePageDetail() {
  const data = useLoaderData() as ImageManageShellData;
  const params = useParams();
  const pagePath = decodeSwitcherPagePathParam(params.pagePath ?? "") ?? "";
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState<string>(
    data.targets.find((o) => o.value === data.initialLanguage)?.value ??
      data.targets[0]?.value ??
      "",
  );
  const [model, setModel] = useState<string>(DEFAULT_IMAGE_TRANSLATE_MODEL);
  const [remaining, setRemaining] = useState<number | null>(data.remainingCredits);
  const [query, setQuery] = useState("");
  const images = useSwitcherPageImages({ pagePath, languageCode: language });
  const recentFailures = useRecentImageFailures("content", language, Boolean(language));
  const refreshAll = useCallback(async () => {
    await images.reload();
    void recentFailures.reload();
  }, [images.reload, recentFailures.reload]);
  const { job, replace: setJob } = useContentImageJob(data.job, refreshAll, "content");
  const { getRowLiveStatus, mergeDisplayRow } = useImageRowLiveStatus(
    job,
    language,
    recentFailures.index,
  );
  const actions = useContentImageActions({
    shop: data.shop,
    languageCode: language,
    onChanged: refreshAll,
  });
  const canWriteFiles = images.canWriteFiles ?? data.canWriteFiles;
  const fmt = useCallback((n: number) => formatAppI18nNumber(n, i18n.language), [i18n.language]);
  const modelOptions = useMemo(
    () => imageTranslateModelOptions(t, fmt),
    [fmt, t],
  );
  const modelMeta = IMAGE_TRANSLATE_MODELS.find((m) => m.id === model) ?? IMAGE_TRANSLATE_MODELS[0];
  const languageLabel = data.targets.find((o) => o.value === language)?.label ?? language;
  const batch = useBatchTranslate({
    job,
    kind: "content",
    canWriteFiles,
    language,
    model,
    creditsPerImage: modelMeta.credits,
    translateOne: actions.translateOne,
    onJobCreated: setJob,
    onSpent: (credits) => setRemaining((r) => (r == null ? r : Math.max(0, r - credits))),
  });
  const { quotaOfferMode } = useImageTranslateQuotaOffer();
  const handleBuyCredits = useCallback(
    (requiredCredits: number) => {
      batch.close();
      openCreditsPurchaseModal(
        buildImageTranslateCreditsPurchaseContext({
          imageCount: batch.rows.length,
          estimatedCredits: requiredCredits,
          currentRemainingCredits: remaining,
        }),
      );
    },
    [batch.close, batch.rows.length, remaining],
  );
  const [clearRows, setClearRows] = useState<ContentImageRow[]>([]);
  const [viewRow, setViewRow] = useState<ContentImageRow | null>(null);
  useEffect(() => {
    setViewRow((current) => {
      if (!current) return current;
      const next = images.rows.find((row) => imageRowKey(row) === imageRowKey(current));
      return next ?? current;
    });
  }, [images.rows]);
  const listPath = switcherImageListPath({ language });
  const backAction = useAppHomeBackAction(listPath, t("switcherImage.title"));
  const title = pagePath
    ? displaySwitcherPagePath(pagePath, language, data.localeCodes ?? [], data.primaryLocale)
    : t("switcherImage.title");
  const q = query.trim().toLowerCase();
  const visibleRows = q
    ? images.rows.filter((row) => row.urlKey.toLowerCase().includes(q) || row.imageUrl.toLowerCase().includes(q))
    : images.rows;

  return (
    <>
      <AppSubpageTitleBar title={title} parentUrl={listPath} />
      <Page>
        <BlockStack gap="400">
          <div>
            <AppPageHeader title={title} backAction={backAction} />
            <ImagePageJobSection
              job={job}
              languageLabel={languageLabel}
              onChanged={setJob}
            />
            <ImageTranslationFailureHint count={recentFailures.index.total} />
          </div>
          {!canWriteFiles ? <FilesAccessBanner /> : null}
          {data.targets.length === 0 ? (
            <AppSectionCard>
              <Text as="p" tone="subdued">{t("contentImage.noLanguage")}</Text>
            </AppSectionCard>
          ) : !pagePath ? (
            <AppSectionCard>
              <Text as="p">{t("contentImage.resourceMissing")}</Text>
            </AppSectionCard>
          ) : (
            <ImageManageListShell
              toolbar={
                <ImageManageToolbar
                  searchPlaceholder={t("contentImage.fileSearchPlaceholder")}
                  query={query}
                  onQueryChange={setQuery}
                  switchers={{
                    type: "switcher",
                    moduleValue: "switcherImage",
                    language,
                    languageOptions: data.targets,
                    onLanguageChange: setLanguage,
                  }}
                />
              }
            >
              {!images.loading && visibleRows.length === 0 ? (
                <span className={listStyles.emptyHint}>{t("switcherImage.emptyPage")}</span>
              ) : (
                <ContentImageTable
                  rows={visibleRows}
                  loading={images.loading}
                  busyKeys={actions.busyKeys}
                  disabled={!language || !canWriteFiles}
                  creditsPerImage={modelMeta.credits}
                  hideUsedIn
                  onTranslate={batch.open}
                  onReplace={actions.replace}
                  onClear={actions.clear}
                  onView={setViewRow}
                  getRowLiveStatus={getRowLiveStatus}
                  mergeDisplayRow={mergeDisplayRow}
                />
              )}
            </ImageManageListShell>
          )}
        </BlockStack>
      </Page>
      <ContentImageConfirmModal
        open={batch.rows.length > 0}
        count={batch.rows.length}
        languageLabel={languageLabel}
        model={model}
        modelOptions={modelOptions}
        onModelChange={setModel}
        creditsPerImage={modelMeta.credits}
        remainingCredits={remaining}
        quotaOfferMode={quotaOfferMode}
        hasTranslated={batch.rows.length > 1 && batch.rows.some((row) => row.translated?.imageAfterUrl)}
        loading={batch.submitting}
        onConfirm={batch.confirm}
        onBuyCredits={handleBuyCredits}
        onClose={batch.close}
      />
      <ContentImageCompareModal
        open={Boolean(viewRow)}
        originalUrl={viewRow?.imageUrl ?? ""}
        translatedUrl={(viewRow ? mergeDisplayRow(viewRow) : null)?.translated?.imageAfterUrl}
        liveStatus={viewRow ? getRowLiveStatus(viewRow) : null}
        translateDisabled={!language || !canWriteFiles}
        translateLoading={
          viewRow ? actions.busyKeys.includes(imageRowKey(viewRow)) : false
        }
        onTranslate={() => {
          if (!viewRow) return;
          startViewImageTranslate({
            remainingCredits: remaining,
            creditsPerImage: modelMeta.credits,
            t,
            run: () => actions.translateOne(viewRow, model),
            onSpent: (credits) => setRemaining((r) => (r == null ? r : Math.max(0, r - credits))),
          });
        }}
        onClose={() => setViewRow(null)}
      />
      <AppSModal
        open={clearRows.length > 0}
        heading={t("contentImage.clearConfirm.heading")}
        onClose={() => setClearRows([])}
        primaryAction={{
          content: t("contentImage.action.clear"),
          tone: "critical",
          onAction: () => {
            const rows = clearRows;
            setClearRows([]);
            void actions.clearMany(rows);
          },
        }}
        secondaryActions={[{ content: t("Cancel"), onAction: () => setClearRows([]) }]}
      >
        <Text as="p">{t("contentImage.clearConfirm.body", { count: clearRows.length, language: languageLabel })}</Text>
      </AppSModal>
    </>
  );
}
