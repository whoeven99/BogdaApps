import { Table, Typography } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import listStyles from "~/ui/styles/appListPage.module.css";
import { isListSkeletonId, skeletonSwitcherPageRows } from "../listLoadingSkeleton";
import { ListSkeletonLine, ListSkeletonThumb } from "./ListSkeletonLine";

const { Text } = Typography;

export type SwitcherPageRow = {
  id: string;
  title: string;
  imageUrl?: string | null;
  translated: number;
  total: number;
};

type Props = {
  rows: SwitcherPageRow[];
  loading: boolean;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onOpen: (id: string) => void;
};

export default function SwitcherImagePageTable({
  rows,
  loading,
  selectedIds,
  onSelectedIdsChange,
  onOpen,
}: Props) {
  const { t } = useTranslation();
  const showSkeleton = loading && rows.length === 0;
  const displayRows = showSkeleton ? skeletonSwitcherPageRows() : rows;
  const tableLoading = loading && rows.length > 0;

  const columns = useMemo(
    () => [
      {
        title: t("switcherImage.column.path"),
        key: "path",
        render: (_: unknown, row: SwitcherPageRow) => (
          <div className={listStyles.cellRow}>
            {isListSkeletonId(row.id) ? (
              <>
                <ListSkeletonThumb />
                <div className={listStyles.listSkeletonTextStack}>
                  <ListSkeletonLine width="68%" height={14} />
                </div>
              </>
            ) : row.imageUrl ? (
              <img className={listStyles.imageThumb} src={`${row.imageUrl}?width=120`} alt="" />
            ) : (
              <div className={listStyles.imageThumbPlaceholder} aria-hidden />
            )}
            {!isListSkeletonId(row.id) ? (
              <button type="button" className={listStyles.resourceLink} onClick={() => onOpen(row.id)}>
                {row.title}
              </button>
            ) : null}
          </div>
        ),
      },
      {
        title: t("switcherImage.column.coverage"),
        key: "coverage",
        width: 160,
        render: (_: unknown, row: SwitcherPageRow) =>
          isListSkeletonId(row.id) ? (
            <ListSkeletonLine width={72} />
          ) : (
            <Text>{t("switcherImage.coverage", { translated: row.translated, total: row.total })}</Text>
          ),
      },
    ],
    [onOpen, t],
  );

  return (
    <Table<SwitcherPageRow>
      className={listStyles.listTable}
      rowKey="id"
      loading={tableLoading}
      dataSource={displayRows}
      columns={columns}
      pagination={false}
      locale={{
        emptyText: showSkeleton ? null : (
          <span className={listStyles.emptyHint}>{t("switcherImage.emptyPages")}</span>
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
