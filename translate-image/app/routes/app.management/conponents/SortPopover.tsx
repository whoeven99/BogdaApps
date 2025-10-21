import { useState, useEffect } from "react";
import { Button, Popover, Radio, Divider, Space } from "antd";
import { SortAscendingOutlined } from "@ant-design/icons";

export default function SortPopover({
  onChange,
}: {
  onChange?: (sortKey: string, sortOrder: "asc" | "desc") => void;
}) {
  const [sortKey, setSortKey] = useState("TITLE");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [open, setOpen] = useState(false);

  const sortOptions = [
    { label: "产品标题", value: "TITLE" },
    { label: "创建时间", value: "CREATED_AT" },
    { label: "更新时间", value: "UPDATED_AT" },
    { label: "库存", value: "INVENTORY" },
    { label: "产品类型", value: "PRODUCT_TYPE" },
    { label: "发布时间", value: "PUBLISHED_AT" },
    { label: "厂商", value: "VENDOR" },
  ];

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
      <div style={{ fontWeight: 500, marginBottom: 8 }}>排序依据</div>
      <Radio.Group
        onChange={(e) => handleSortChange(e.target.value)}
        value={sortKey}
        style={{ display: "flex", flexDirection: "column", gap: 6 }}
      >
        {sortOptions.map((opt) => (
          <Radio key={opt.value} value={opt.value}>
            {opt.label}
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
          从旧到新
        </Button>
        <Button
          type={sortOrder === "desc" ? "primary" : "text"}
          icon={<SortAscendingOutlined rotate={180} />}
          onClick={() => handleOrderChange("desc")}
          block
        >
          从新到旧
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
