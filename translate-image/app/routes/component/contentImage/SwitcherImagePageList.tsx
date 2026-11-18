import { useNavigate, useLoaderData } from "@remix-run/react";
import { BlockStack, Page, Pagination, Text } from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useState } from "react";
import { openCreditsPurchaseModal } from "~/utils/creditsPurchaseModal";
import { buildImageTranslateCreditsPurchaseContext } from "~/utils/creditsPurchaseTaskContext";
import { useTranslation } from "react-i18next";
import { formatAppI18nNumber } from "~/lib/appI18nRtl";
import { IMAGE_RESOURCE_BULK_SELECT_MAX } from "~/lib/imageResourcePaths";
import { switcherImageDetailPath } from "~/lib/switcherPagePath";
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
import ContentImageConfirmModal from "./components/ContentImageConfirmModal";
import { ImagePageJobSection } from "./components/ImagePageJobSection";
import { ImageTranslationFailureHint } from "./components/ImageTranslationFailureHint";
import { ImageManageListShell } from "./components/ImageManageListShell";
import SwitcherImagePageTable from "./components/SwitcherImagePageTable";
import { ImageManageToolbar } from "./components/ImageManageToolbar";
import { useContentImageJob } from "./useContentImageJob";
import { useContentImageActions } from "./useContentImageActions";
import { useBatchTranslate } from "./useBatchTranslate";
import { useSwitcherPageList } from "./useSwitcherPageList";
import { useRecentImageFailures } from "./useRecentImageFailures";
import { fetchSwitcherImages } from "./contentImageClient";
import type { ImageManageShellData } from "./ImageResourceListPage";
import { useImageTranslateQuotaOffer } from "./useImageTranslateQuotaOffer";

function useDebounced(value: string, ms = 400): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export default function SwitcherImagePageList() {
  const data = useLoaderData() as ImageManageShellData;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const q = useDebounced(query);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [language, setLanguage] = useState(
    data.targets.find((o) => o.value === data.initialLanguage)?.value ?? data.targets[0]?.value ?? "",
  );
  const [model, setModel] = useState<string>(DEFAULT_IMAGE_TRANSLATE_MODEL);
  const [remaining, setRemaining] = useState<number | null>(data.remainingCredits);
  const [collecting, setCollecting] = useState(false);
  const list = useSwitcherPageList({ languageCode: language, q });
  const recentFailures = useRecentImageFailures("content", language, Boolean(language));
  const refreshLists = useCallback(() => {
    list.reload();
    void recentFailures.reload();
  }, [list.reload, recentFailures.reload]);
  const { job, replace: setJob } = useContentImageJob(data.job, refreshLists, "content");
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
  const batch = useBatchTranslate({
    job,
    kind: "content",
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

  useEffect(() => {
    setSelectedPageIds([]);
  }, [list.rows]);

  const selectedRows = list.rows.filter((row) => selectedPageIds.includes(row.id));
  const parent = "/app";
  const title = t("switcherImage.title");

  const collectAndTranslate = async () => {
    if (selectedRows.length === 0 || !language) return;
    const pagePaths = selectedRows.map((row) => row.id);
    setCollecting(true);
    const res = await fetchSwitcherImages({
      languageCode: language,
      pagePaths: pagePaths.slice(0, IMAGE_RESOURCE_BULK_SELECT_MAX),
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
    if (res.response.truncated || pagePaths.length > IMAGE_RESOURCE_BULK_SELECT_MAX) {
      shopify.toast.show(t("contentImage.truncatedSelection"));
    }
    batch.open(res.response.rows);
  };

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
      <AppSubpageTitleBar title={title} parentUrl={parent} />
      <Page>
        <BlockStack gap="400">
          <div>
            <AppPageHeader title={title} />
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
                  searchPlaceholder={t("switcherImage.searchPlaceholder")}
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
              <SwitcherImagePageTable
                rows={list.rows}
                loading={list.loading}
                selectedIds={selectedPageIds}
                onSelectedIdsChange={setSelectedPageIds}
                onOpen={(id) => navigate(switcherImageDetailPath(id, language))}
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
