import { Table } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import { imageResourceSourceLabel } from "~/lib/imageResourceSource";
import listStyles from "~/ui/styles/appListPage.module.css";
import type { ImageResourceType } from "~/lib/imageResourcePaths";
import type { ThemeImageUsedIn } from "~/lib/themeImageUsedIn";
import {
  imageResourceListIsFlatImage,
  imageResourceListPrimaryColumnKey,
  imageResourceListShowsSource,
} from "../imageResourceUi";
import {
  isListSkeletonId,
  skeletonResourceRows,
} from "../listLoadingSkeleton";
import type { ImageRowLiveStatus } from "../imageRowLiveStatus";
import { ListSkeletonLine, ListSkeletonThumb } from "./ListSkeletonLine";
import ImageRowStatusBadge from "./ImageRowStatusBadge";
import { ImageResourceTranslationCell } from "./ImageResourceTranslationCell";

export type ResourceListRow = {
  id: string;
  title: string;
  status: string;
  imageUrl?: string | null;
  imageCount?: number;
  translatedImageCount?: number;
  urlKey?: string;
  translated?: {
    imageId: string;
    imageBeforeUrl: string;
    imageAfterUrl: string | null;
    urlKey: string | null;
  } | null;
  usedIn?: ThemeImageUsedIn[];
};

function statusTone(status: string): "success" | "caution" | "critical" | "neutral" {
  if (status === "ACTIVE" || status === "PUBLISHED" || status === "READY") return "success";
  if (status === "DRAFT" || status === "PROCESSING" || status === "UPLOADED") return "caution";
  if (status === "FAILED") return "critical";
  return "neutral";
}

type Props = {
  type: ImageResourceType;
  rows: ResourceListRow[];
  loading: boolean;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onOpen: (id: string) => void;
  onPreviewImage?: (row: ResourceListRow) => void;
  getRowLiveStatus?: (row: ResourceListRow) => ImageRowLiveStatus | null;
  failuresByResourceId?: Map<string, number>;
  showTranslationColumn?: boolean;
};

export default function ContentImageResourceTable({
  type,
  rows,
  loading,
  selectedIds,
  onSelectedIdsChange,
  onOpen,
  onPreviewImage,
  getRowLiveStatus,
  failuresByResourceId,
  showTranslationColumn = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const isFlat = imageResourceListIsFlatImage(type);
  const isCatalogResource = !isFlat;
  const showSource = imageResourceListShowsSource(type);
  const showSkeleton = loading && rows.length === 0;
  const displayRows = showSkeleton ? skeletonResourceRows() : rows;
  const tableLoading = loading && rows.length > 0;

  const columns = useMemo(
    () => {
      const thumb = (row: ResourceListRow) => {
        if (isListSkeletonId(row.id)) return <ListSkeletonThumb />;
        return row.imageUrl ? (
          onPreviewImage ? (
            <button
              type="button"
              className={listStyles.imagePreviewThumbOnly}
              onClick={() => onPreviewImage(row)}
              aria-label={t("contentImage.action.view")}
            >
              <img className={listStyles.imageThumb} src={`${row.imageUrl}?width=120`} alt="" />
            </button>
          ) : (
            <img className={listStyles.imageThumb} src={`${row.imageUrl}?width=120`} alt="" />
          )
        ) : null;
      };

      const cols: Parameters<typeof Table<ResourceListRow>>[0]["columns"] = [
        {
          title: t(imageResourceListPrimaryColumnKey(type)),
          key: "resource",
          render: (_: unknown, row: ResourceListRow) => {
            if (isListSkeletonId(row.id)) {
              return (
                <div className={listStyles.cellRow}>
                  {!isCatalogResource ? <ListSkeletonThumb /> : null}
                  <div className={listStyles.listSkeletonTextStack}>
                    <ListSkeletonLine width="62%" height={14} />
                    <ListSkeletonLine width="44%" height={12} />
                  </div>
                </div>
              );
            }
            if (isCatalogResource) {
              const count = row.imageCount;
              return (
                <div className={listStyles.cellRow}>
                  <div className={listStyles.cellTextStack}>
                    <button
                      type="button"
                      className={listStyles.resourceRowTitle}
                      onClick={() => onOpen(row.id)}
                    >
                      {row.title}
                    </button>
                    {count != null && count > 0 ? (
                      <span className={listStyles.resourceRowMeta}>
                        {t("contentImage.resourceImageCount", { count })}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            }
            return (
              <div className={listStyles.cellRow}>
                {thumb(row)}
                <div className={listStyles.cellTextStack}>
                  <button
                    type="button"
                    className={listStyles.imageRowTitle}
                    onClick={() => onOpen(row.id)}
                    title={t("contentImage.themeRow.openPreview")}
                  >
                    {row.title}
                  </button>
                </div>
              </div>
            );
          },
        },
      ];

      if (showSource) {
        cols.push({
          title: t("contentImage.column.source"),
          key: "source",
          render: (_: unknown, row: ResourceListRow) =>
            isListSkeletonId(row.id) ? (
              <ListSkeletonLine width="70%" />
            ) : (
              <span className={listStyles.cellSecondaryText}>
                {imageResourceSourceLabel(type, row, t, i18n.language)}
              </span>
            ),
        });
      }

      if (isFlat) {
        cols.push({
          title: t("contentImage.column.status"),
          key: "translateStatus",
          width: 140,
          render: (_: unknown, row: ResourceListRow) => {
            if (isListSkeletonId(row.id)) {
              return <ListSkeletonLine width={88} height={22} radius={999} />;
            }
            const live = getRowLiveStatus?.(row);
            if (live) return <ImageRowStatusBadge status={live} />;
            if (row.translated?.imageAfterUrl) {
              return <AppStatusBadge tone="success">{t("contentImage.status.translated")}</AppStatusBadge>;
            }
            return <AppStatusBadge tone="neutral">{t("contentImage.status.notTranslated")}</AppStatusBadge>;
          },
        });
      } else {
        cols.push({
          title: t("contentImage.column.status"),
          key: "status",
          width: 160,
          render: (_: unknown, row: ResourceListRow) =>
            isListSkeletonId(row.id) ? (
              <ListSkeletonLine width={88} height={22} radius={999} />
            ) : (
              <AppStatusBadge tone={statusTone(row.status)}>
                {t(`contentImage.storeStatus.${row.status}`, { defaultValue: row.status })}
              </AppStatusBadge>
            ),
        });
        if (showTranslationColumn) {
          cols.push({
            title: t("contentImage.column.translation"),
            key: "translation",
            width: 180,
            render: (_: unknown, row: ResourceListRow) =>
              isListSkeletonId(row.id) ? (
                <ListSkeletonLine width={100} height={22} radius={999} />
              ) : (
                <ImageResourceTranslationCell
                  row={row}
                  failedInResource={failuresByResourceId?.get(row.id) ?? 0}
                />
              ),
          });
        }
      }

      return cols;
    },
    [
      failuresByResourceId,
      getRowLiveStatus,
      i18n.language,
      isCatalogResource,
      isFlat,
      onOpen,
      onPreviewImage,
      showSource,
      showTranslationColumn,
      t,
      type,
    ],
  );

  return (
    <Table<ResourceListRow>
      className={listStyles.listTable}
      rowKey="id"
      loading={tableLoading}
      dataSource={displayRows}
      columns={columns}
      pagination={false}
      locale={{
        emptyText: showSkeleton ? null : (
          <span className={listStyles.emptyHint}>{t(`contentImage.resourceEmpty.${type}`)}</span>
        ),
      }}
      rowSelection={
        showSkeleton
          ? undefined
          : {
              selectedRowKeys: selectedIds,
              onChange: (keys) => onSelectedIdsChange(keys as string[]),
            }
      }
    />
  );
}
