import React, { useState, useEffect, useRef, useMemo } from "react";
import { Table, Select, Input, Button, Space, Alert, Tag, InputNumber, Typography } from "antd";
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";

const { Text } = Typography;

// Preset value options per field type
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

// Fields that use number input
const NUMERIC_FIELDS = ["od_sph", "od_cyl", "od_add", "os_sph", "os_cyl", "os_add", "pd"];

// Fields that use text input (free form)
const TEXT_FIELDS = ["productType", "tags"];

function emptyRule() {
  return {
    fromNodeRef: "",
    fromOptionId: "",
    toNodeRef: "",
    condition: { field: "prescriptionType", operator: "eq", value: "" },
  };
}

/**
 * Extract selectable options from a node.
 * Handles: prescription_type (direct options), submit_method (direct options), lens_step (pages[].options[])
 */
function getNodeOptions(nodes, nodeRef) {
  if (!nodeRef || !Array.isArray(nodes)) return [];
  const node = nodes.find(n => n.ref === nodeRef);
  if (!node) return [];

  // Direct options
  if (Array.isArray(node.options)) {
    return node.options.filter(o => o.enabled !== false).map(o => ({
      label: (o.name || o.type || o.key || o.id || "?"),
      value: o.type || o.key || o.id || "",
    }));
  }

  // lens_step: options nested in pages
  if (node.type === "lens_step" && Array.isArray(node.pages)) {
    const result = [];
    for (const page of node.pages) {
      if (!Array.isArray(page.options)) continue;
      for (const opt of page.options) {
        const label = opt.title || opt.productTitle || opt.lensOptionId || opt.id || "?";
        const value = opt.id || opt.lensOptionId || "";
        if (value) result.push({ label, value });
      }
    }
    return result;
  }

  return [];
}

function getNodeLabel(nodes, ref) {
  const labels = {
    prescription_type: "Prescription Type",
    submit_method: "Submit Method",
    single_vision_form: "Single Vision Form",
    progressive_form: "Progressive Form",
    reading_form: "Reading Form",
    upload_step: "Upload Step",
    lens_step: "Lens Step",
    review_order: "Order Review",
    custom_step: "Custom Step",
  };
  const node = nodes.find(n => n.ref === ref);
  return node ? (labels[node.type] || node.type || ref) : ref;
}

/**
 * Check reachability of a single jump rule.
 * Returns: { status: "valid"|"warning"|"error", message: string }
 */
function checkReachability(rule, nodes) {
  const fromIdx = nodes.findIndex(n => n.ref === rule.fromNodeRef);
  const toIdx = nodes.findIndex(n => n.ref === rule.toNodeRef);

  if (!rule.fromNodeRef) return { status: "error", message: "Source node not selected" };
  if (!rule.toNodeRef) return { status: "error", message: "Target node not selected" };
  if (fromIdx === -1) return { status: "error", message: `Source node "${rule.fromNodeRef}" not found in flow` };
  if (toIdx === -1) return { status: "error", message: `Target node "${rule.toNodeRef}" not found in flow` };
  if (fromIdx === toIdx) return { status: "error", message: "Source and target are the same node" };
  if (toIdx < fromIdx) return { status: "warning", message: "Jumps backward. This may create loops — use with caution." };
  if (!rule.condition?.field) return { status: "warning", message: "Condition field not set — rule will never match" };
  if (!rule.condition?.operator) return { status: "warning", message: "Condition operator not set" };
  if (rule.condition?.value === "" || rule.condition?.value == null) return { status: "warning", message: "Condition value is empty — rule may not match" };

  return { status: "valid", message: "Reachable" };
}

export default function LogicJumpsEditor({ jumpRules, nodeRefs, nodes, onChange }) {
  const { t } = useI18n();

  const FIELD_OPTIONS = [
    { label: t("logicJumps.fieldPrescriptionType") || "Prescription Type", value: "prescriptionType" },
    { label: t("logicJumps.fieldProductType") || "Product Type", value: "productType" },
    { label: t("logicJumps.fieldTags") || "Tags", value: "tags" },
    { label: t("logicJumps.fieldSubmitMethod") || "Submit Method", value: "submitMethod" },
    { label: t("logicJumps.fieldOdSph") || "OD SPH", value: "od_sph" },
    { label: t("logicJumps.fieldOdCyl") || "OD CYL", value: "od_cyl" },
    { label: t("logicJumps.fieldOdAdd") || "OD ADD", value: "od_add" },
    { label: t("logicJumps.fieldOsSph") || "OS SPH", value: "os_sph" },
    { label: t("logicJumps.fieldOsCyl") || "OS CYL", value: "os_cyl" },
    { label: t("logicJumps.fieldOsAdd") || "OS ADD", value: "os_add" },
    { label: t("logicJumps.fieldPd") || "PD", value: "pd" },
  ];

  const OPERATOR_OPTIONS = [
    { label: "Equals (=)", value: "eq" },
    { label: "Not Equals (≠)", value: "neq" },
    { label: "Contains", value: "contains" },
    { label: "Greater Than (>)", value: "gt" },
    { label: "Less Than (<)", value: "lt" },
    { label: "Greater or Equal (≥)", value: "gte" },
    { label: "Less or Equal (≤)", value: "lte" },
  ];

  const [data, setData] = useState(jumpRules || []);
  const lastEmittedRef = useRef(jumpRules);
  const allNodes = nodes || [];

  // Filter toNodeRef for each rule: exclude the fromNode
  const refOptions = useMemo(() => {
    return (nodeRefs || allNodes.map(n => n.ref).filter(Boolean)).map(ref => ({
      label: getNodeLabel(allNodes, ref),
      value: ref,
    }));
  }, [nodeRefs, allNodes]);

  // fromNodeRef options: only nodes that have selectable options
  const fromNodeOptions = useMemo(() => {
    return (nodeRefs || allNodes.map(n => n.ref).filter(Boolean))
      .filter(ref => {
        const node = allNodes.find(n => n.ref === ref);
        if (!node) return true; // show unknown refs too
        // Nodes with options: prescription_type, submit_method, lens_step
        const hasOptions = Array.isArray(node.options) && node.options.length > 0;
        const hasPages = node.type === "lens_step" && Array.isArray(node.pages) && node.pages.some(p => Array.isArray(p.options) && p.options.length > 0);
        return hasOptions || hasPages;
      })
      .map(ref => ({
        label: getNodeLabel(allNodes, ref),
        value: ref,
      }));
  }, [nodeRefs, allNodes]);

  useEffect(() => {
    if (jumpRules && jumpRules !== lastEmittedRef.current) {
      setData(jumpRules);
    }
  }, [jumpRules]);

  const syncData = (next) => {
    setData(next);
    lastEmittedRef.current = next;
    if (onChange) onChange(next);
  };

  const addRule = () => {
    syncData([...data, emptyRule()]);
  };

  const removeRule = (index) => {
    syncData(data.filter((_, i) => i !== index));
  };

  const updateRule = (index, field, value) => {
    syncData(data.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const updateCondition = (index, field, value) => {
    syncData(
      data.map((r, i) =>
        i === index
          ? { ...r, condition: { ...r.condition, [field]: value } }
          : r
      )
    );
  };

  // Get value options for a specific condition field
  const getValueOptions = (field) => {
    if (!field) return [];
    if (FIELD_VALUE_MAP[field]) return FIELD_VALUE_MAP[field];
    return [];
  };

  const getOperatorOptions = (field) => {
    if (!field) return OPERATOR_OPTIONS;
    if (NUMERIC_FIELDS.includes(field)) {
      return OPERATOR_OPTIONS.filter(o => !["contains"].includes(o.value));
    }
    // For text/string fields, only eq/neq/contains make sense
    return OPERATOR_OPTIONS.filter(o => ["eq", "neq", "contains"].includes(o.value));
  };

  const isNumericField = (field) => NUMERIC_FIELDS.includes(field);
  const isTextField = (field) => TEXT_FIELDS.includes(field);

  const columns = [
    {
      title: t("logicJumps.fromNodeRef") || "From Node",
      dataIndex: "fromNodeRef",
      key: "fromNodeRef",
      width: 150,
      render: (val, _, index) => (
        <Select
          value={val || undefined}
          onChange={(v) => {
            updateRule(index, "fromNodeRef", v);
            // Clear fromOptionId when switching fromNode
            updateRule(index, "fromOptionId", "");
          }}
          options={fromNodeOptions}
          placeholder={t("logicJumps.nodeRefPlaceholder") || "Select source node"}
          style={{ width: "100%" }}
          size="small"
          allowClear
        />
      ),
    },
    {
      title: t("logicJumps.fromOptionId") || "When Option",
      dataIndex: "fromOptionId",
      key: "fromOptionId",
      width: 140,
      render: (val, record, index) => {
        const optionList = getNodeOptions(allNodes, record.fromNodeRef);
        if (optionList.length === 0) {
          return (
            <Input
              value={val || ""}
              onChange={(e) => updateRule(index, "fromOptionId", e.target.value)}
              placeholder={t("logicJumps.optionIdPlaceholder") || "Option ID (optional)"}
              size="small"
              disabled
            />
          );
        }
        return (
          <Select
            value={val || undefined}
            onChange={(v) => updateRule(index, "fromOptionId", v)}
            options={optionList}
            placeholder={t("logicJumps.selectOption") || "Any option"}
            style={{ width: "100%" }}
            size="small"
            allowClear
          />
        );
      },
    },
    {
      title: t("logicJumps.toNodeRef") || "Jump To",
      dataIndex: "toNodeRef",
      key: "toNodeRef",
      width: 150,
      render: (val, record, index) => {
        const filteredRefs = refOptions.filter(o => o.value !== record.fromNodeRef);
        return (
          <Select
            value={val || undefined}
            onChange={(v) => updateRule(index, "toNodeRef", v)}
            options={filteredRefs}
            placeholder={t("logicJumps.selectTarget") || "Select target node"}
            style={{ width: "100%" }}
            size="small"
            allowClear
          />
        );
      },
    },
    {
      title: t("logicJumps.condition") || "Condition",
      key: "condition",
      render: (_, record, index) => {
        const c = record.condition || {};
        const valueOpts = getValueOptions(c.field);
        const numericField = isNumericField(c.field);
        const textField = isTextField(c.field);

        return (
          <Space size="small" wrap>
            <Select
              value={c.field || undefined}
              onChange={(v) => {
                updateCondition(index, "field", v);
                // Reset operator and value when field changes
                updateCondition(index, "operator", "");
                updateCondition(index, "value", "");
              }}
              options={FIELD_OPTIONS}
              placeholder={t("logicJumps.fieldPlaceholder") || "Field"}
              style={{ width: 130 }}
              size="small"
            />
            <Select
              value={c.operator || undefined}
              onChange={(v) => updateCondition(index, "operator", v)}
              options={getOperatorOptions(c.field)}
              placeholder={t("logicJumps.operatorPlaceholder") || "Op"}
              style={{ width: 100 }}
              size="small"
              disabled={!c.field}
            />
            {valueOpts.length > 0 ? (
              <Select
                value={c.value || undefined}
                onChange={(v) => updateCondition(index, "value", v)}
                options={valueOpts}
                placeholder={t("logicJumps.valuePlaceholder") || "Value"}
                style={{ width: 130 }}
                size="small"
                disabled={!c.operator}
              />
            ) : numericField ? (
              <InputNumber
                value={c.value !== "" && c.value != null ? parseFloat(c.value) : undefined}
                onChange={(v) => updateCondition(index, "value", v != null ? String(v) : "")}
                placeholder={t("logicJumps.valuePlaceholder") || "Value"}
                style={{ width: 100 }}
                size="small"
                step={0.25}
                disabled={!c.operator}
              />
            ) : (
              <Input
                value={c.value || ""}
                onChange={(e) => updateCondition(index, "value", e.target.value)}
                placeholder={t("logicJumps.valuePlaceholder") || "Value"}
                style={{ width: 110 }}
                size="small"
                disabled={!c.operator}
              />
            )}
          </Space>
        );
      },
    },
    {
      title: t("logicJumps.reachability") || "Status",
      key: "reachability",
      width: 130,
      render: (_, record) => {
        const reach = checkReachability(record, allNodes);
        return (
          <Tag
            color={reach.status === "valid" ? "success" : reach.status === "warning" ? "warning" : "error"}
            icon={
              reach.status === "valid" ? <CheckCircleOutlined /> :
              reach.status === "warning" ? <ExclamationCircleOutlined /> :
              <CloseCircleOutlined />
            }
            style={{ fontSize: 11 }}
          >
            {reach.status === "valid" ? "✓ Valid" :
             reach.status === "warning" ? "⚠ " + reach.message :
             "✗ " + reach.message}
          </Tag>
        );
      },
    },
    {
      title: t("common.actions") || "",
      key: "actions",
      width: 50,
      render: (_, __, index) => (
        <Button
          type="link"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeRule(index)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: "8px 0" }}>
      <Alert
        type="info"
        message={t("logicJumps.intro") || "Logic jumps let you redirect customers to different steps based on conditions. The condition is evaluated after the user completes the source step."}
        showIcon
        closable
        style={{ marginBottom: 12 }}
      />

      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={addRule} size="small">
          {t("logicJumps.addRule") || "Add Logic Jump"}
        </Button>
        {data.length > 0 && (
          <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
            {data.filter(r => checkReachability(r, allNodes).status === "error").length > 0
              ? ` ⚠ ${data.filter(r => checkReachability(r, allNodes).status === "error").length} rule(s) have errors`
              : data.filter(r => checkReachability(r, allNodes).status === "warning").length > 0
                ? ` ⚡ ${data.filter(r => checkReachability(r, allNodes).status === "warning").length} rule(s) have warnings`
                : " ✓ All rules are valid"}
          </Text>
        )}
      </div>

      {data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#bbb", fontSize: 13, background: "#fafafa", borderRadius: 6 }}>
          {t("logicJumps.noRules") || "No jump rules defined. The flow will proceed sequentially through each step."}
        </div>
      ) : (
        <Table
          dataSource={data}
          columns={columns}
          rowKey={(_, index) => String(index)}
          size="small"
          pagination={false}
          bordered
        />
      )}
    </div>
  );
}
