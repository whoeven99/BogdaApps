import React, { useState, useMemo } from "react";
import { Tabs, Input, Typography, Empty } from "antd";
import { useI18n } from "../hooks/useI18n";

const { Text } = Typography;
const { TextArea } = Input;

export default function TextTranslationEditor({ nodes, translations, onChange }) {
  const { t } = useI18n();

  const LANGS = [
    { key: "en", label: t("textTranslation.english") || "English" },
    { key: "zh-CN", label: "中文" },
  ];

  const [selectedKey, setSelectedKey] = useState(null);
  const [activeLang, setActiveLang] = useState("en");

  const fieldGroups = useMemo(() => {
    const groups = [];
    for (const node of nodes || []) {
      const fields = [];
      const content = node.content || {};
      if (content.title !== undefined) fields.push({ key: node.ref + ".title", label: "Title", nodeRef: node.ref });
      if (content.subtitle !== undefined) fields.push({ key: node.ref + ".subtitle", label: "Subtitle", nodeRef: node.ref });
      if (content.description !== undefined) fields.push({ key: node.ref + ".description", label: "Description", nodeRef: node.ref });
      if (content.footerDescription !== undefined) fields.push({ key: node.ref + ".footerDescription", label: t("textTranslation.footerDescription") || "Footer Description", nodeRef: node.ref });
      if (content.htmlContent !== undefined) fields.push({ key: node.ref + ".htmlContent", label: "HTML Content", nodeRef: node.ref });
      if (fields.length > 0) {
        groups.push({ nodeRef: node.ref, nodeType: node.type, fields });
      }
    }
    return groups;
  }, [nodes, t]);

  const selectedField = useMemo(() => {
    if (!selectedKey) return null;
    for (const group of fieldGroups) {
      for (const f of group.fields) {
        if (f.key === selectedKey) return f;
      }
    }
    return null;
  }, [selectedKey, fieldGroups]);

  const currentValue = useMemo(() => {
    if (!selectedField) return "";
    const nodeTrans = translations?.[selectedField.nodeRef] || {};
    const fieldTrans = nodeTrans[selectedField.label] || {};
    return fieldTrans[activeLang] || "";
  }, [selectedField, translations, activeLang]);

  const handleValueChange = (e) => {
    if (!selectedField) return;
    const value = e.target.value;
    const nodeRef = selectedField.nodeRef;
    const field = selectedField.label;
    const next = { ...(translations || {}) };
    const nodeTrans = { ...(next[nodeRef] || {}) };
    const fieldTrans = { ...(nodeTrans[field] || {}) };
    if (value) {
      fieldTrans[activeLang] = value;
    } else {
      delete fieldTrans[activeLang];
    }
    nodeTrans[field] = fieldTrans;
    next[nodeRef] = nodeTrans;
    if (onChange) onChange(next);
  };

  return (
    <div style={{ display: "flex", gap: 16, minHeight: 400 }}>
      <div style={{ width: 260, flexShrink: 0, border: "1px solid #f0f0f0", borderRadius: 8, padding: 12, overflow: "auto" }}>
        <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 600 }}>
          {t("textTranslation.fieldKeys") || "Field Keys"}
        </Text>
        <div style={{ marginTop: 8 }}>
          {fieldGroups.length === 0 && (
            <Empty description={t("textTranslation.noFields") || "No fields to translate"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
          {fieldGroups.map((group) => (
            <div key={group.nodeRef} style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13 }}>{group.nodeRef}</Text>
              <div style={{ marginTop: 2 }}>
                {group.fields.map((f) => (
                  <div
                    key={f.key}
                    onClick={() => setSelectedKey(f.key)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 13,
                      backgroundColor: selectedKey === f.key ? "#e6f4ff" : "transparent",
                      color: selectedKey === f.key ? "#1677ff" : "inherit",
                    }}
                  >
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, border: "1px solid #f0f0f0", borderRadius: 8, padding: 16 }}>
        {!selectedField && (
          <div style={{ textAlign: "center", paddingTop: 80, color: "#999" }}>
            {t("textTranslation.selectHint") || "Select a field key from the left to edit translations."}
          </div>
        )}
        {selectedField && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ fontSize: 15 }}>{selectedField.nodeRef}</Text>
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                / {selectedField.label}
              </Text>
            </div>
            <Tabs
              activeKey={activeLang}
              onChange={setActiveLang}
              size="small"
              items={LANGS.map((l) => ({
                key: l.key,
                label: l.label,
              }))}
            />
            <TextArea
              value={currentValue}
              onChange={handleValueChange}
              rows={4}
              placeholder={t("textTranslation.translationFor") || ("Translation for " + activeLang)}
              style={{ marginTop: 8 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
