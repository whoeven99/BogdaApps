import { useNavigate, useLoaderData } from "@remix-run/react";
import { BlockStack, Page, Pagination, Text } from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useState } from "react";
import { openCreditsPurchaseModal } from "~/utils/creditsPurchaseModal";
import { buildImageTranslateCreditsPurchaseContext } from "~/utils/creditsPurchaseTaskContext";
import { useTranslation } from "react-i18next";
import { formatAppI18nNumber } from "~/lib/appI18nRtl";
import {
  CONTENT_IMAGE_JOB_MAX_ITEMS,
  IMAGE_RESOURCE_BULK_SELECT_MAX,
  RESOURCE_STATUS_TABS,
  imageJobKindForResource,
  imageResourceDetailPath,
  type ImageResourceType,
} from "~/lib/imageResourcePaths";
import { FilesAccessBanner } from "~/lib/FilesAccessBanner";
import {
  DEFAULT_IMAGE_TRANSLATE_MODEL,
  IMAGE_TRANSLATE_MODELS,
  imageTranslateModelOptions,
} from "~/lib/imageTranslate";
import AppButton from "~/ui/components/AppButton";
import AppPageHeader from "~/ui/components/AppPageHeader";
import AppSectionCard from "~/ui/components/AppSectionCard";
import AppSubpageTitleBar from "~/ui/components/AppSubpageTitleBar";
import listStyles from "~/ui/styles/appListPage.module.css";
import ContentImageCompareModal from "./components/ContentImageCompareModal";
import ContentImageConfirmModal from "./components/ContentImageConfirmModal";
import ContentImageResourceTable, {
  type ResourceListRow,
} from "./components/ContentImageResourceTable";
import {
  imageResourceListOpensDetail,
  imageResourceListSupportsPreview,
  imageResourceSearchPlaceholderKey,
  imageResourceAutoClassifyOnMount,
} from "./imageResourceUi";
import { ImagePageJobSection } from "./components/ImagePageJobSection";
import { ImageTranslationFailureHint } from "./components/ImageTranslationFailureHint";
import { ImageManageListShell } from "./components/ImageManageListShell";
import { ImageManageToolbar } from "./components/ImageManageToolbar";
import { useContentImageClassify } from "./useContentImageClassify";
import { useContentImageJob } from "./useContentImageJob";
import { useImageRowLiveStatus } from "./useImageRowLiveStatus";
import { useContentImageActions } from "./useContentImageActions";
import { useBatchTranslate } from "./useBatchTranslate";
import { useImageResourceList } from "./useImageResourceList";
import { useRecentImageFailures } from "./useRecentImageFailures";
import { useImageTranslateQuotaOffer } from "./useImageTranslateQuotaOffer";
import { startViewImageTranslate } from "./startViewImageTranslate";
import {
  fetchResourceImages,
  fetchResourceImagesMany,
  imageRowKey,
  resourceListRowToContentImageRow,
  type ContentImageJob,
  type ContentImageRow,
} from "./contentImageClient";

export type ImageManageShellData = {
  shop: string;
  targets: Array<{ value: string; label: string }>;
  primaryLocale?: string;
  localeCodes?: string[];
  initialLanguage: string | null;
  canWriteFiles: boolean;
  job: ContentImageJob | null;
  remainingCredits: number | null;
};

function useDebounced(value: string, ms = 400): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export default function ImageResourceListPage({ type }: { type: ImageResourceType }) {
  const data = useLoaderData() as ImageManageShellData;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const kind = imageJobKindForResource(type);
  const [query, setQuery] = useState("");
  const q = useDebounced(query);
  const [status, setStatus] = useState("all");
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [language, setLanguage] = useState(
    data.targets.find((o) => o.value === data.initialLanguage)?.value ?? data.targets[0]?.value ?? "",
  );
  const [model, setModel] = useState<string>(DEFAULT_IMAGE_TRANSLATE_MODEL);
  const [remaining, setRemaining] = useState<number | null>(data.remainingCredits);
  const [collecting, setCollecting] = useState(false);
  const autoClassify = imageResourceAutoClassifyOnMount(type);
  const supportsPreview = imageResourceListSupportsPreview(type);
  const opensDetail = imageResourceListOpensDetail(type);
  const [previewResource, setPreviewResource] = useState<ResourceListRow | null>(null);
  const [previewRows, setPreviewRows] = useState<ContentImageRow[]>([]);
  const list = useImageResourceList({
    type,
    q,
    status,
    languageCode: language,
    uiLocale: i18n.language,
  });
  useContentImageClassify(autoClassify, list.reload);
  const recentFailures = useRecentImageFailures(kind, language, Boolean(language));
  const refreshLists = useCallback(async () => {
    await list.reload();
    void recentFailures.reload();
  }, [list.reload, recentFailures.reload]);
  const { job, replace: setJob } = useContentImageJob(data.job, refreshLists, kind);
  const { getRowLiveStatus, mergeDisplayRow } = useImageRowLiveStatus(
    job,
    language,
    recentFailures.index,
  );
  const showTranslationColumn = type === "product" && Boolean(language);
  const actions = useContentImageActions({
    shop: data.shop,
    languageCode: language,
    onChanged: refreshLists,
  });
  const canWriteFiles = list.canWriteFiles ?? data.canWriteFiles;
  const fmt = useCallback((n: number) => formatAppI18nNumber(n, i18n.language), [i18n.language]);
  const modelOptions = useMemo(
    () => imageTranslateModelOptions(t, fmt),
    [fmt, t],
  );
  const modelMeta = IMAGE_TRANSLATE_MODELS.find((m) => m.id === model) ?? IMAGE_TRANSLATE_MODELS[0];
  const languageLabel = data.targets.find((o) => o.value === language)?.label ?? language;
  const { quotaOfferMode } = useImageTranslateQuotaOffer();
  const batch = useBatchTranslate({
    job,
    kind,
    canWriteFiles,
    language,
    model,
    creditsPerImage: modelMeta.credits,
    translateOne: actions.translateOne,
    onJobCreated: (next) => {
      setJob(next);
      void recentFailures.reload();
    },
    onSpent: (credits) => setRemaining((r) => (r == null ? r : Math.max(0, r - credits))),
  });
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

  useEffect(() => {
    setSelectedResourceIds([]);
  }, [list.rows]);

  /** 列表 reload 后合并最新译图状态，避免弹窗仍持有打开时的快照。 */
  const previewResourceLive = useMemo(() => {
    if (!previewResource) return null;
    return list.rows.find((row) => row.id === previewResource.id) ?? previewResource;
  }, [previewResource, list.rows]);

  useEffect(() => {
    if (!previewResourceLive || !language) {
      setPreviewRows([]);
      return;
    }
    let cancelled = false;
    void fetchResourceImages({
      type,
      resourceId: previewResourceLive.id,
      languageCode: language,
      uiLocale: i18n.language,
    }).then((res) => {
      if (cancelled || !res.success || !res.response) return;
      setPreviewRows(res.response.rows);
    });
    return () => {
      cancelled = true;
    };
  }, [
    previewResourceLive?.id,
    previewResourceLive?.translated?.imageAfterUrl,
    language,
    type,
    i18n.language,
    job?.done,
    job?.status,
    job?.id,
  ]);

  const previewMatchRow = useMemo((): ContentImageRow | null => {
    if (!previewResourceLive) return null;
    const fromList = resourceListRowToContentImageRow(previewResourceLive);
    if (previewRows.length === 0) return fromList;
    if (!previewResourceLive.imageUrl) return previewRows[0] ?? fromList;
    const coverKey = previewResourceLive.imageUrl.split("?")[0] ?? "";
    const fromFetch =
      previewRows.find((row) => row.imageUrl.split("?")[0] === coverKey) ?? previewRows[0] ?? null;
    if (fromList && fromFetch && fromList.urlKey === fromFetch.urlKey) {
      const translated = fromFetch.translated?.imageAfterUrl
        ? fromFetch.translated
        : fromList.translated ?? fromFetch.translated;
      return { ...fromList, translated: translated ?? null };
    }
    return fromFetch ?? fromList;
  }, [previewResourceLive, previewRows]);

  const previewTranslatedUrl =
    (previewMatchRow ? mergeDisplayRow(previewMatchRow) : null)?.translated?.imageAfterUrl ?? null;

  const openResourcePreview = useCallback(
    (row: ResourceListRow) => {
      if (!supportsPreview || !row.imageUrl) return;
      setPreviewResource(row);
    },
    [supportsPreview],
  );

  const startPreviewTranslate = useCallback(() => {
    if (!previewMatchRow) return;
    startViewImageTranslate({
      remainingCredits: remaining,
      creditsPerImage: modelMeta.credits,
      t,
      run: () => actions.translateOne(previewMatchRow, model),
      onSpent: (credits) => setRemaining((r) => (r == null ? r : Math.max(0, r - credits))),
    });
  }, [actions, model, modelMeta.credits, previewMatchRow, remaining, t]);

  const selectedRows = list.rows.filter((row) => selectedResourceIds.includes(row.id));
  const parent = "/app";
  const tabs = RESOURCE_STATUS_TABS[type];
  const pageTitle = t(`${type}Image.title`);

  const collectAndTranslate = async () => {
    if (selectedRows.length === 0 || !language) return;
    if (!opensDetail) {
      const rows = selectedRows
        .map((row) => resourceListRowToContentImageRow(row))
        .filter((row): row is ContentImageRow => Boolean(row));
      if (rows.length === 0) {
        shopify.toast.show(t("contentImage.noImagesInSelection"), { isError: true });
        return;
      }
      if (rows.length > CONTENT_IMAGE_JOB_MAX_ITEMS) {
        shopify.toast.show(t("contentImage.truncatedSelection"));
      }
      batch.open(rows.slice(0, CONTENT_IMAGE_JOB_MAX_ITEMS));
      return;
    }
    const resourceIds = selectedRows.map((row) => row.id);
    setCollecting(true);
    const res = await fetchResourceImagesMany({
      type,
      resourceIds: resourceIds.slice(0, IMAGE_RESOURCE_BULK_SELECT_MAX),
      languageCode: language,
      uiLocale: i18n.language,
    });
    setCollecting(false);
    if (!res.success || !res.response) {
      shopify.toast.show(t("contentImage.collectFailed"), { isError: true });
      return;
    }
    if (res.response.rows.length === 0) {
      shopify.toast.show(t("contentImage.noImagesInSelection"), { isError: true });
      return;
    }
    if (res.response.truncated || resourceIds.length > IMAGE_RESOURCE_BULK_SELECT_MAX) {
      shopify.toast.show(t("contentImage.truncatedSelection"));
    }
    batch.open(res.response.rows);
  };

  const statusOptions = useMemo(
    () => tabs.map((tab) => ({ value: tab, label: t(`contentImage.statusTab.${tab}`) })),
    [tabs, t],
  );

  const bulkBar =
    selectedRows.length > 0 ? (
      <AppButton
        type="primary"
        size="small"
        loading={collecting}
        disabled={!language || !canWriteFiles || batch.submitting}
        onClick={() => void collectAndTranslate()}
      >
        {t("contentImage.action.translate")}
      </AppButton>
    ) : null;

  return (
    <>
      <AppSubpageTitleBar title={pageTitle} parentUrl={parent} />
      <Page>
        <BlockStack gap="400">
          <div>
            <AppPageHeader title={pageTitle} />
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
          ) : (
            <ImageManageListShell
              bulkBar={bulkBar}
              toolbar={
                <ImageManageToolbar
                  searchPlaceholder={t(imageResourceSearchPlaceholderKey(type))}
                  query={query}
                  onQueryChange={setQuery}
                  switchers={{
                    type,
                    language,
                    languageOptions: data.targets,
                    onLanguageChange: setLanguage,
                  }}
                  status={
                    tabs.length > 1
                      ? {
                          options: statusOptions,
                          value: status,
                          onChange: setStatus,
                        }
                      : undefined
                  }
                />
              }
            >
              <ContentImageResourceTable
                type={type}
                rows={list.rows}
                loading={list.loading}
                selectedIds={selectedResourceIds}
                onSelectedIdsChange={setSelectedResourceIds}
                showTranslationColumn={showTranslationColumn}
                failuresByResourceId={recentFailures.index.failuresByResourceId}
                getRowLiveStatus={(row) => {
                  const imageRow = resourceListRowToContentImageRow(row);
                  return imageRow ? getRowLiveStatus(imageRow) : null;
                }}
                onOpen={(id) => {
                  if (!opensDetail) {
                    const row = list.rows.find((item) => item.id === id);
                    if (row) openResourcePreview(row);
                    return;
                  }
                  navigate(imageResourceDetailPath(type, id, language));
                }}
                onPreviewImage={supportsPreview ? openResourcePreview : undefined}
              />
              <div className={listStyles.listPagination}>
                <Pagination
                  hasPrevious={list.hasPrevious && !list.loading}
                  onPrevious={list.previous}
                  hasNext={list.hasNextPage && !list.loading}
                  onNext={list.next}
                />
              </div>
            </ImageManageListShell>
          )}
        </BlockStack>
      </Page>
      <ContentImageCompareModal
        open={Boolean(previewResourceLive?.imageUrl)}
        originalUrl={previewResourceLive?.imageUrl ?? ""}
        translatedUrl={previewTranslatedUrl}
        liveStatus={previewMatchRow ? getRowLiveStatus(previewMatchRow) : null}
        translateDisabled={!language || !canWriteFiles}
        translateLoading={
          previewMatchRow
            ? actions.busyKeys.includes(imageRowKey(previewMatchRow))
            : false
        }
        onTranslate={startPreviewTranslate}
        onClose={() => setPreviewResource(null)}
      />
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
        loading={batch.submitting || collecting}
        onConfirm={batch.confirm}
        onBuyCredits={handleBuyCredits}
        onClose={batch.close}
      />
    </>
  );
}
