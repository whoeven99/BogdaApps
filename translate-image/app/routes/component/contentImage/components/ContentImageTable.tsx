import { Checkbox, Flex, Table, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import AppButton from "~/ui/components/AppButton";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import listStyles from "~/ui/styles/appListPage.module.css";
import { displayThemeImageUsedIn } from "~/lib/themeImageUsedIn";
import { imageRowKey, type ContentImageRow } from "../contentImageClient";
import type { ImageRowLiveStatus } from "../imageRowLiveStatus";
import ImageRowStatusBadge from "./ImageRowStatusBadge";
import { isListSkeletonId, skeletonContentImageRows } from "../listLoadingSkeleton";
import { ListSkeletonLine, ListSkeletonThumb } from "./ListSkeletonLine";

const { Text } = Typography;

type Props = {
  rows: ContentImageRow[];
  loading: boolean;
  busyKeys: string[];
  disabled: boolean;
  creditsPerImage: number;
  hideUsedIn?: boolean;
  onTranslate: (rows: ContentImageRow[]) => void;
  onReplace: (row: ContentImageRow, file: File) => void;
  onClear: (row: ContentImageRow) => void;
  onView: (row: ContentImageRow) => void;
  /** 进行中图译任务：行级状态（与任务卡一致）。 */
  getRowLiveStatus?: (row: ContentImageRow) => ImageRowLiveStatus | null;
  /** 任务 item 已译完、列表未刷新时的行展示（View / Clear）。 */
  mergeDisplayRow?: (row: ContentImageRow) => ContentImageRow;
};

function fileName(urlKey: string): string {
  return urlKey.split("/").pop() ?? urlKey;
}

function RowActions({
  row,
  busy,
  disabled,
  stacked = false,
  onTranslate,
  onReplace,
  onClear,
  onView,
}: {
  row: ContentImageRow;
  busy: boolean;
  disabled: boolean;
  stacked?: boolean;
  onTranslate: Props["onTranslate"];
  onReplace: Props["onReplace"];
  onClear: Props["onClear"];
  onView: Props["onView"];
}) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const translatedUrl = row.translated?.imageAfterUrl;
  const actionClass = stacked
    ? `${listStyles.rowActions} ${listStyles.rowActionsStacked}`
    : listStyles.rowActions;
  return (
    <div className={actionClass}>
      <AppButton size="small" loading={busy} disabled={disabled} onClick={() => onTranslate([row])}>
        {t("contentImage.action.translate")}
      </AppButton>
      <AppButton size="small" disabled={busy || disabled} onClick={() => fileRef.current?.click()}>
        {t("contentImage.action.replace")}
      </AppButton>
      {translatedUrl ? (
        <>
          <AppButton type="text" size="small" onClick={() => onView(row)}>
            {t("contentImage.action.view")}
          </AppButton>
          <AppButton
            type="text"
            size="small"
            danger
            disabled={busy || disabled}
            onClick={() => onClear(row)}
          >
            {t("contentImage.action.clear")}
          </AppButton>
        </>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onReplace(row, file);
        }}
      />
    </div>
  );
}

function useNarrowImageList() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}

function renderImageStatus(
  row: ContentImageRow,
  props: Pick<Props, "getRowLiveStatus">,
  t: ReturnType<typeof useTranslation>["t"],
) {
  if (isListSkeletonId(row.urlKey)) {
    return <ListSkeletonLine width={88} height={22} radius={999} />;
  }
  const live = props.getRowLiveStatus?.(row);
  if (live) return <ImageRowStatusBadge status={live} />;
  if (row.translated?.imageAfterUrl) {
    return (
      <AppStatusBadge tone="success">{t("contentImage.status.translated")}</AppStatusBadge>
    );
  }
  return (
    <AppStatusBadge tone="neutral">{t("contentImage.status.notTranslated")}</AppStatusBadge>
  );
}

function ContentImageMobileList({
  rows,
  selectedRowKeys,
  onSelectedRowKeysChange,
  showSkeleton,
  props,
}: {
  rows: ContentImageRow[];
  selectedRowKeys: string[];
  onSelectedRowKeysChange: (keys: string[]) => void;
  showSkeleton: boolean;
  props: Props;
}) {
  const { t, i18n } = useTranslation();

  if (!showSkeleton && rows.length === 0) {
    return <span className={listStyles.emptyHint}>{t("contentImage.empty")}</span>;
  }

  const toggleKey = (key: string, checked: boolean) => {
    onSelectedRowKeysChange(
      checked
        ? [...selectedRowKeys, key]
        : selectedRowKeys.filter((item) => item !== key),
    );
  };

  return (
    <div className={listStyles.imageRowCardList}>
      {rows.map((row) => {
        const key = imageRowKey(row);
        const skeleton = isListSkeletonId(row.urlKey);
        const displayRow = props.mergeDisplayRow?.(row) ?? row;
        const selected = selectedRowKeys.includes(key);
        return (
          <div key={key} className={listStyles.imageRowCard}>
            {!skeleton ? (
              <div className={listStyles.imageRowCardCheck}>
                <Checkbox
                  checked={selected}
                  onChange={(e) => toggleKey(key, e.target.checked)}
                />
              </div>
            ) : null}
            <div className={listStyles.imageRowCardBody}>
              {skeleton ? (
                <div className={listStyles.cellRow}>
                  <ListSkeletonThumb />
                  <div className={listStyles.listSkeletonTextStack}>
                    <ListSkeletonLine width="72%" height={14} />
                    <ListSkeletonLine width="48%" height={12} />
                  </div>
                </div>
              ) : (
                <div className={listStyles.imageRowCardThumbRow}>
                  <button
                    type="button"
                    className={listStyles.imagePreviewTrigger}
                    onClick={() => props.onView(displayRow)}
                  >
                    <img
                      className={listStyles.imageThumb}
                      src={`${row.imageUrl}?width=120`}
                      alt=""
                    />
                    <span className={listStyles.cellFileName}>
                      {fileName(row.urlKey)}
                    </span>
                  </button>
                </div>
              )}
              {!props.hideUsedIn && !skeleton ? (
                <div>
                  {!row.usedIn.length ? (
                    <AppStatusBadge tone="neutral">
                      {t("contentImage.usedIn.unused")}
                    </AppStatusBadge>
                  ) : (
                    <Text type="secondary">
                      {row.usedIn.length > 1
                        ? t("contentImage.usedInCount", {
                            title: displayThemeImageUsedIn(row.usedIn[0], t, i18n.language),
                            count: row.usedIn.length,
                          })
                        : displayThemeImageUsedIn(row.usedIn[0], t, i18n.language)}
                    </Text>
                  )}
                </div>
              ) : null}
              {renderImageStatus(displayRow, props, t)}
              {skeleton ? (
                <ListSkeletonLine width="100%" height={28} />
              ) : (
                <RowActions
                  row={displayRow}
                  busy={props.busyKeys.includes(key)}
                  disabled={props.disabled}
                  stacked
                  onTranslate={props.onTranslate}
                  onReplace={props.onReplace}
                  onClear={props.onClear}
                  onView={props.onView}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ContentImageTable(props: Props) {
  const { t, i18n } = useTranslation();
  const narrow = useNarrowImageList();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const showSkeleton = props.loading && props.rows.length === 0;
  const displayRows = showSkeleton ? skeletonContentImageRows() : props.rows;
  const tableLoading = props.loading && props.rows.length > 0;

  useEffect(() => {
    setSelectedRowKeys([]);
  }, [props.rows]);

  const selectedRows = useMemo(
    () => props.rows.filter((r) => selectedRowKeys.includes(imageRowKey(r))),
    [props.rows, selectedRowKeys],
  );
  const columns = useMemo(() => {
    const cols: Parameters<typeof Table<ContentImageRow>>[0]["columns"] = [
      {
        title: t("contentImage.column.image"),
        key: "image",
        render: (_, row) =>
          isListSkeletonId(row.urlKey) ? (
            <div className={listStyles.cellRow}>
              <ListSkeletonThumb />
              <div className={listStyles.listSkeletonTextStack}>
                <ListSkeletonLine width="72%" height={14} />
                <ListSkeletonLine width="48%" height={12} />
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={listStyles.imagePreviewTrigger}
              onClick={() => props.onView(props.mergeDisplayRow?.(row) ?? row)}
            >
              <img
                className={listStyles.imageThumb}
                src={`${row.imageUrl}?width=120`}
                alt=""
              />
              <span className={listStyles.cellFileName}>{fileName(row.urlKey)}</span>
            </button>
          ),
      },
    ];
    if (!props.hideUsedIn) {
      cols.push({
        title: t("contentImage.column.usedIn"),
        key: "usedIn",
        render: (_, row) => {
          if (isListSkeletonId(row.urlKey)) {
            return <ListSkeletonLine width="80%" />;
          }
          if (!row.usedIn.length) {
            return (
              <AppStatusBadge tone="neutral">{t("contentImage.usedIn.unused")}</AppStatusBadge>
            );
          }
          const first = displayThemeImageUsedIn(row.usedIn[0], t, i18n.language);
          return (
            <Text type="secondary">
              {row.usedIn.length > 1
                ? t("contentImage.usedInCount", { title: first, count: row.usedIn.length })
                : first}
            </Text>
          );
        },
      });
    }
    cols.push(
      {
        title: t("contentImage.column.status"),
        key: "status",
        width: 140,
        render: (_, row) => renderImageStatus(row, props, t),
      },
      {
        title: t("contentImage.column.actions"),
        key: "actions",
        width: 280,
        render: (_, row) =>
          isListSkeletonId(row.urlKey) ? (
            <ListSkeletonLine width="85%" height={28} />
          ) : (
          <RowActions
            row={props.mergeDisplayRow?.(row) ?? row}
            busy={props.busyKeys.includes(imageRowKey(row))}
            disabled={props.disabled}
            onTranslate={props.onTranslate}
            onReplace={props.onReplace}
            onClear={props.onClear}
            onView={props.onView}
          />
          ),
      },
    );
    return cols;
  }, [i18n.language, props, t]);

  return (
    <>
      {selectedRows.length > 0 ? (
        <Flex
          wrap="wrap"
          gap={8}
          align="center"
          justify="flex-end"
          className={listStyles.tableTranslateBar}
        >
          <AppButton
            type="primary"
            size="small"
            disabled={props.disabled}
            onClick={() => props.onTranslate(selectedRows)}
          >
            {t("contentImage.action.translate")}
          </AppButton>
        </Flex>
      ) : null}
      {narrow ? (
        <ContentImageMobileList
          rows={displayRows}
          selectedRowKeys={selectedRowKeys}
          onSelectedRowKeysChange={setSelectedRowKeys}
          showSkeleton={showSkeleton}
          props={props}
        />
      ) : (
        <Table<ContentImageRow>
          className={listStyles.listTable}
          rowKey={(row) => imageRowKey(row)}
          loading={tableLoading}
          dataSource={displayRows}
          columns={columns}
          pagination={false}
          locale={{
            emptyText: showSkeleton ? null : (
              <span className={listStyles.emptyHint}>{t("contentImage.empty")}</span>
            ),
          }}
          rowSelection={
            showSkeleton
              ? undefined
              : {
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys as string[]),
                }
          }
        />
      )}
    </>
  );
}
