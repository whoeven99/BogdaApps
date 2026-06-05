import React from "react";
import { Select, Input, InputNumber, Space, Tag } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";

const NUMERIC_FIELDS = ["od_sph", "od_cyl", "od_add", "os_sph", "os_cyl", "os_add", "pd"];

// Preset value options for known fields
const FIELD_VALUE_MAP = {
  prescriptionType: [
    { label: "single_vision", value: "single_vision" },
    { label: "progressive", value: "progressive" },
    { label: "reading", value: "reading" },
    { label: "non_prescription", value: "non_prescription" },
  ],
  submitMethod: [
    { label: "manual", value: "manual" },
    { label: "upload", value: "upload" },
    { label: "later", value: "later" },
  ],
};

function getOperators(field, t) {
  const OPERATOR_OPTIONS_ALL = [
    { label: t("displayCondition.operatorEq") || "Equals (eq)", value: "eq" },
    { label: t("displayCondition.operatorNeq") || "Not Equals (neq)", value: "neq" },
    { label: t("displayCondition.operatorContains") || "Contains", value: "contains" },
    { label: t("displayCondition.operatorGt") || "Greater Than (gt)", value: "gt" },
    { label: t("displayCondition.operatorLt") || "Less Than (lt)", value: "lt" },
    { label: t("displayCondition.operatorGte") || "Greater or Equal (gte)", value: "gte" },
    { label: t("displayCondition.operatorLte") || "Less or Equal (lte)", value: "lte" },
  ];

  const TEXT_OPERATORS = [
    { label: t("displayCondition.operatorEq") || "Equals (eq)", value: "eq" },
    { label: t("displayCondition.operatorNeq") || "Not Equals (neq)", value: "neq" },
    { label: t("displayCondition.operatorContains") || "Contains", value: "contains" },
  ];

  if (!field) return OPERATOR_OPTIONS_ALL;
  if (NUMERIC_FIELDS.includes(field)) {
    return OPERATOR_OPTIONS_ALL.filter((o) => o.value !== "contains");
  }
  return TEXT_OPERATORS;
}

function getFieldOptions(t) {
  return [
    { label: t("displayCondition.prescriptionType") || "Prescription Type", value: "prescriptionType" },
    { label: t("displayCondition.productType") || "Product Type", value: "productType" },
    { label: t("displayCondition.tags") || "Tags", value: "tags" },
    { label: t("displayCondition.submitMethod") || "Submit Method", value: "submitMethod" },
    { label: t("displayCondition.odSph") || "OD SPH", value: "od_sph" },
    { label: t("displayCondition.odCyl") || "OD CYL", value: "od_cyl" },
    { label: t("displayCondition.odAdd") || "OD ADD", value: "od_add" },
    { label: t("displayCondition.osSph") || "OS SPH", value: "os_sph" },
    { label: t("displayCondition.osCyl") || "OS CYL", value: "os_cyl" },
    { label: t("displayCondition.osAdd") || "OS ADD", value: "os_add" },
    { label: t("displayCondition.pd") || "PD", value: "pd" },
  ];
}

function detectConflicts(conditions) {
  const byField = {};
  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    if (!c.field || !c.operator || !c.value) continue;
    if (!byField[c.field]) byField[c.field] = [];
    byField[c.field].push({ index: i, operator: c.operator, value: c.value });
  }
  const conflicts = [];
  for (const [field, entries] of Object.entries(byField)) {
    if (entries.length <= 1) continue;
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        const sameOp = a.operator === b.operator;
        const sameVal = a.value === b.value;
        const bothContains = a.operator === "contains" && b.operator === "contains";
        if (bothContains && !sameVal) continue;
        if (sameOp && sameVal) {
          conflicts.push({ field, kind: "duplicate", message: `Conditions #${a.index + 1} and #${b.index + 1} are identical. Remove one of them.` });
        } else if (sameOp && !sameVal) {
          conflicts.push({ field, kind: "contradiction", message: `Conditions #${a.index + 1} and #${b.index + 1} both require "${field}" to equal different values ("${a.value}" vs "${b.value}"). This will never match.` });
        } else {
          conflicts.push({ field, kind: "conflict", message: `Conditions #${a.index + 1} and #${b.index + 1} both filter on "${field}" but use different operators. Only one value-based condition per field is recommended.` });
        }
      }
    }
  }
  return conflicts;
}

export default function DisplayConditionBuilder({ condition, onChange, siblingConditions = [], currentIndex = 0 }) {
  const { t } = useI18n();

  const FIELD_OPTIONS = getFieldOptions(t);

  const currentField = condition?.field || "";
  const currentOperator = condition?.operator || "";
  const currentValue = condition?.value || "";

  const conflicts = detectConflicts(siblingConditions);

  const handleFieldChange = (value) => {
    const next = {
      field: value,
      operator: "",
      value: "",
    };
    if (onChange) onChange(next);
  };

  const handleOperatorChange = (value) => {
    if (onChange) onChange({ ...condition, operator: value });
  };

  const handleValueChange = (e) => {
    if (onChange) onChange({ ...condition, value: e.target.value });
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="text-sm font-semibold mb-3 text-gray-700">
        {t("displayCondition.title") || "Display Condition"}
        {currentIndex > 0 && (
          <span style={{ fontSize: 12, fontWeight: 400, color: "#999", marginLeft: 6 }}>
            #{currentIndex + 1}
          </span>
        )}
      </h4>

      <Space wrap size="small">
        <Select
          value={currentField || undefined}
          onChange={handleFieldChange}
          options={FIELD_OPTIONS}
          placeholder={t("displayCondition.selectField") || "Select field"}
          style={{ minWidth: 160 }}
          allowClear
        />

        <Select
          value={currentOperator || undefined}
          onChange={handleOperatorChange}
          options={getOperators(currentField, t)}
          placeholder={t("displayCondition.selectOperator") || "Operator"}
          style={{ minWidth: 160 }}
          disabled={!currentField}
        />

        {(() => {
          const valueOptions = FIELD_VALUE_MAP[currentField];
          if (valueOptions) {
            return (
              <Select
                value={currentValue || undefined}
                onChange={(v) => onChange({ ...condition, value: v })}
                options={valueOptions}
                placeholder={t("displayCondition.valuePlaceholder") || "Value"}
                style={{ minWidth: 160 }}
                disabled={!currentOperator}
              />
            );
          }
          if (NUMERIC_FIELDS.includes(currentField)) {
            return (
              <InputNumber
                value={currentValue !== "" && currentValue != null ? parseFloat(currentValue) : undefined}
                onChange={(v) => onChange({ ...condition, value: v != null ? String(v) : "" })}
                placeholder={t("displayCondition.valuePlaceholder") || "Value"}
                style={{ minWidth: 160 }}
                step={0.25}
                disabled={!currentOperator}
              />
            );
          }
          return (
            <Input
              value={currentValue}
              onChange={handleValueChange}
              placeholder={t("displayCondition.valuePlaceholder") || "Value"}
              style={{ minWidth: 160 }}
              disabled={!currentOperator}
            />
          );
        })()}
      </Space>

      {conflicts.length > 0 && (
        <div style={{
          marginTop: 8,
          padding: "8px 12px",
          background: "#fffbe6",
          border: "1px solid #ffe58f",
          borderRadius: 6,
          fontSize: 12,
          color: "#ad6800",
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            <WarningOutlined style={{ marginRight: 4 }} />
            {t("displayCondition.conflictWarning") || "Ambiguous conditions detected"}
          </div>
          {conflicts.map((c, i) => (
            <div key={i} style={{ marginBottom: 2 }}>
              {c.kind === "contradiction" && (
                <Tag color="red" style={{ fontSize: 10, marginRight: 4 }}>互斥</Tag>
              )}
              {c.kind === "duplicate" && (
                <Tag color="orange" style={{ fontSize: 10, marginRight: 4 }}>重复</Tag>
              )}
              {c.kind === "conflict" && (
                <Tag color="gold" style={{ fontSize: 10, marginRight: 4 }}>冲突</Tag>
              )}
              {c.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
