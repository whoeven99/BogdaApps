import { useState, useEffect } from "react";
import { Button, Popover, Radio, Divider, Space } from "antd";
import { SortAscendingOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
export default function SortPopover({
  onChange,
  sortKeyProp,
  sortOrderProp,
}: {
  onChange?: (sortKey: string, sortOrder: "asc" | "desc") => void;
  sortKeyProp: string;
  sortOrderProp: "asc" | "desc";
}) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState(sortKeyProp);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(sortOrderProp);
  const [open, setOpen] = useState(false);

  const sortOptions = [
    { label: "Product Title", value: "TITLE" },
    { label: "Creation time", value: "CREATED_AT" },
    { label: "Update time", value: "UPDATED_AT" },
    { label: "Inventory", value: "INVENTORY" },
    { label: "Product Type", value: "PRODUCT_TYPE" },
    // { label: "发布时间", value: "PUBLISHED_AT" },
    { label: "Manufacturers", value: "VENDOR" },
  ];
  useEffect(() => {
    setSortKey(sortKeyProp);
    setSortOrder(sortOrderProp);
  }, [sortKeyProp, sortOrderProp]);

  const handleSortChange = (value: string) => {
    setSortKey(value);
    // ✅ 同步调用外部回调
    onChange?.(value, sortOrder);
  };

  const handleOrderChange = (order: "asc" | "desc") => {
    setSortOrder(order);
    // ✅ 同步调用外部回调
    onChange?.(sortKey, order);
  };

  const content = (
    <div style={{ width: 200 }}>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>
        {t("Sorting criteria")}
      </div>
      <Radio.Group
        onChange={(e) => handleSortChange(e.target.value)}
        value={sortKey}
        style={{ display: "flex", flexDirection: "column", gap: 6 }}
      >
        {sortOptions.map((opt) => (
          <Radio key={opt.value} value={opt.value}>
            {t(opt.label)}
          </Radio>
        ))}
      </Radio.Group>

      <Divider style={{ margin: "12px 0" }} />

      <Space direction="vertical" style={{ width: "100%" }}>
        <Button
          type={sortOrder === "asc" ? "primary" : "text"}
          icon={<SortAscendingOutlined />}
          onClick={() => handleOrderChange("asc")}
          block
        >
          {t("From old to new")}
        </Button>
        <Button
          type={sortOrder === "desc" ? "primary" : "text"}
          icon={<SortAscendingOutlined rotate={180} />}
          onClick={() => handleOrderChange("desc")}
          block
        >
          {t("From new to old")}
        </Button>
      </Space>
    </div>
  );

  return (
    <Popover
      content={content}
      title={null}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
    >
      <Button icon={<SortAscendingOutlined />} />
    </Popover>
  );
}
