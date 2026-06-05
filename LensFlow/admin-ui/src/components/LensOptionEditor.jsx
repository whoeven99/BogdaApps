import React, { useState, useEffect, useRef } from "react";
import { Collapse, Input, Switch, Select, Button, Space, Tag, Typography } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";
import LensOptionDetailEditor from "./LensOptionDetailEditor";

const { Text } = Typography;

let idCounter = Date.now();

function uid() {
  return "lopt_" + (idCounter++);
}

function emptyOption() {
  return {
    id: uid(),
    lensOptionId: "",
    enabled: true,
    badge: { text: "", style: "default" },
    title: "",
    description: "",
    modalDescription: "",
    isSkipOption: false,
    leadsTo: "",
    displayCondition: [],
  };
}

export default function LensOptionEditor({ options, onChange, nodeRefs }) {
  const { t } = useI18n();
  const [data, setData] = useState(options || []);
  const lastEmittedRef = useRef(options);
  const [activeKeys, setActiveKeys] = useState([]);
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const [pendingOptionIndex, setPendingOptionIndex] = useState(null);

  const refOptions = (nodeRefs || []).map((ref) => ({
    label: ref,
    value: ref,
  }));

  useEffect(() => {
    if (options && options !== lastEmittedRef.current) {
      setData(options);
    }
  }, [options]);

  const syncData = (next) => {
    setData(next);
    lastEmittedRef.current = next;
    if (onChange) onChange(next);
  };

  const addOption = () => {
    syncData([...data, emptyOption()]);
  };

  const updateOption = (index, partial) => {
    syncData(data.map((item, i) => (i === index ? { ...item, ...partial } : item)));
  };

  const removeOption = (index) => {
    syncData(data.filter((_, i) => i !== index));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const next = [...data];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    syncData(next);
  };

  const moveDown = (index) => {
    if (index === data.length - 1) return;
    const next = [...data];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    syncData(next);
  };

  const handleCollapseChange = (keys) => {
    setActiveKeys(keys);
  };

  const getHeaderText = (option, index) => {
    const ref = option.lensOptionId || `Option ${index + 1}`;
    const badge = option.badge?.text;
    const product = option.productTitle || option.productId || null;
    const variant = option.variantTitle || null;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", paddingRight: 8 }}>
        <Space size="small">
          <Text strong style={{ fontSize: 13, color: "#333" }}>
            {t("lensOption.option") || "Option"} {index + 1}: {ref}
          </Text>
          {badge && <Tag color="blue" style={{ fontSize: 11 }}>{badge}</Tag>}
          {product && (
            <Tag color="green" style={{ fontSize: 11, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
              {product}{variant ? ` – ${variant}` : ""}
            </Tag>
          )}
          {!product && (
            <Tag color="default" style={{ fontSize: 11 }}>
              {t("lensOptionDetail.noProduct") || "No product"}
            </Tag>
          )}
        </Space>

        <Space size={0} onClick={(e) => e.stopPropagation()}>
          <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={index === 0}
            onClick={() => moveUp(index)} style={{ padding: "0 3px", height: 22, fontSize: 10, color: "#999" }} />
          <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={index === data.length - 1}
            onClick={() => moveDown(index)} style={{ padding: "0 3px", height: 22, fontSize: 10, color: "#999" }} />
          <Button type="text" danger size="small" icon={<DeleteOutlined />}
            onClick={() => removeOption(index)} style={{ padding: "0 3px", height: 22, fontSize: 10 }} />
        </Space>
      </div>
    );
  };

  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={addOption}>
          {t("lensOption.addOption") || "Add Lens Option"}
        </Button>
      </div>

      {data.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#bbb", fontSize: 13 }}>
          {t("lensOption.noOptions") || "No lens options added yet."}
        </div>
      )}

      {data.length > 0 && (
        <Collapse
          activeKey={activeKeys}
          onChange={handleCollapseChange}
          size="small"
          style={{ background: "#fff" }}
          items={data.map((option, index) => ({
            key: option.id || String(index),
            label: getHeaderText(option, index),
            children: (
              <div>
                <div style={{
                  background: "#fafafa",
                  borderRadius: 6,
                  padding: "12px 16px",
                  marginBottom: 12,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                    {t("lensOption.basicConfig") || "Basic Configuration"}
                  </div>

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                    <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                        {t("lensOption.lensOptionId") || "Internal Reference"}
                      </div>
                      <Input
                        size="small"
                        value={option.lensOptionId || ""}
                        onChange={(e) => updateOption(index, { lensOptionId: e.target.value })}
                        placeholder={t("lensOption.idPlaceholder") || "e.g. lens-basic, lens-pro"}
                      />
                    </div>

                    <div style={{ flex: "1 1 200px", minWidth: 180 }}>
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                        {t("lensOption.leadsTo") || "Leads To"}
                      </div>
                      <Select
                        size="small"
                        allowClear
                        style={{ width: "100%" }}
                        value={option.leadsTo || undefined}
                        onChange={(v) => updateOption(index, { leadsTo: v })}
                        placeholder={t("lensOption.selectTarget") || "Select target node ref"}
                        options={refOptions}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {t("lensOption.isSkipOption") || "Skip Option"}
                    </div>
                    <Switch
                      size="small"
                      checked={!!option.isSkipOption}
                      onChange={(v) => updateOption(index, { isSkipOption: v })}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {t("lensOption.helpSkip") || "Customers can skip this option without selecting."}
                    </Text>
                  </div>
                </div>

                <LensOptionDetailEditor
                  option={option}
                  onChange={(updated) => updateOption(index, updated)}
                  nodeRefs={nodeRefs}
                />
              </div>
            ),
          }))}
        />
      )}
    </div>
  );
}
