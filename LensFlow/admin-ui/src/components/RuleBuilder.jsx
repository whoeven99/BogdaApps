import React, { useState, useEffect } from "react";
import { Select } from "antd";
import { useI18n } from "../hooks/useI18n";
import { useShopify } from "../hooks/useShopify";

const FIELD_OPTIONS = [
  "prescriptionType", "productType", "tags",
  "od_sph", "od_cyl", "od_add",
  "os_sph", "os_cyl", "os_add",
  "submitMethod"
];
const OPERATOR_OPTIONS = ["eq", "neq", "contains", "gt", "lt", "gte", "lte"];
const ACTION_TYPES = ["show", "hide", "disable"];

const emptyCondition = () => ({ field: "prescriptionType", operator: "eq", value: "" });
const emptyAction = () => ({ type: "show", lensOptionId: "" });

export default function RuleBuilder({ initial, onSave, onCancel, saving }) {
  const { t } = useI18n();
  const { authenticatedFetch } = useShopify();
  const [name, setName] = useState(initial?.name || "");
  const [priority, setPriority] = useState(initial?.priority || 50);
  const [conditions, setConditions] = useState(
    initial?.conditions?.length ? initial.conditions.map(c => ({ ...c })) : [emptyCondition()]
  );
  const [actions, setActions] = useState(
    initial?.actions?.length ? initial.actions.map(a => ({ ...a })) : [emptyAction()]
  );
  const [lensOptions, setLensOptions] = useState([]);

  useEffect(() => {
    authenticatedFetch("/api/admin/lens-options/manage")
      .then(r => r.json())
      .then(json => { if (json.body) setLensOptions(json.body); })
      .catch(() => setLensOptions([{ id: "lens-basic", name: "Basic Lens" }, { id: "lens-pro", name: "Pro Lens" }]));
  }, []);

  const updateCondition = (i, key, val) => {
    setConditions(prev => prev.map((c, j) => j === i ? { ...c, [key]: val } : c));
  };
  const removeCondition = (i) => {
    setConditions(prev => prev.filter((_, j) => j !== i));
  };
  const updateAction = (i, key, val) => {
    setActions(prev => prev.map((a, j) => j === i ? { ...a, [key]: val } : a));
  };
  const removeAction = (i) => {
    setActions(prev => prev.filter((_, j) => j !== i));
  };

  const handleSave = () => {
    onSave({
      name,
      priority: Number(priority),
      conditions: conditions.filter(c => c.field && c.value),
      actions: actions.filter(a => a.type && a.lensOptionId),
    });
  };

  const inputStyle = { padding: "6px 8px", border: "1px solid #ccc", borderRadius: 4, fontSize: 13 };
  const btnStyle = { padding: "4px 10px", border: "1px solid #ccc", borderRadius: 4, cursor: "pointer", fontSize: 12, background: "#fff" };
  const dangerBtn = { ...btnStyle, color: "#d82c0d", borderColor: "#d82c0d" };

  const getOperatorOptions = (field) => {
    if (["od_sph", "od_cyl", "od_add", "os_sph", "os_cyl", "os_add"].includes(field)) {
      return ["eq", "neq", "gt", "lt", "gte", "lte"];
    }
    return OPERATOR_OPTIONS;
  };

  return (
    <div style={{ background: "#f9f9f9", border: "1px solid #e3e3e3", borderRadius: 8, padding: 18, marginTop: 12 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
        <label style={{ fontSize: 13 }}>
          Name<br />
          <input value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, width: 220, marginTop: 2 }} placeholder={t("ruleBuilder.ruleNamePlaceholder") || "Rule name"} />
        </label>
        <label style={{ fontSize: 13 }}>
          Priority<br />
          <input type="number" value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inputStyle, width: 80, marginTop: 2 }} />
        </label>
      </div>

      <div style={{ marginBottom: 14 }}>
        <strong style={{ fontSize: 13 }}>Conditions</strong>
        {conditions.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
            <Select value={c.field} onChange={v => updateCondition(i, "field", v)} style={{ width: 230 }} size="small">
              {FIELD_OPTIONS.map(f => <Select.Option key={f} value={f}>{t("ruleBuilder.fieldLabel." + f) || f}</Select.Option>)}
            </Select>
            <Select value={c.operator} onChange={v => updateCondition(i, "operator", v)} style={{ width: 130 }} size="small">
              {getOperatorOptions(c.field).map(o => <Select.Option key={o} value={o}>{t("ruleBuilder.operatorLabel." + o) || o}</Select.Option>)}
            </Select>
            <input value={c.value} onChange={e => updateCondition(i, "value", e.target.value)} style={{ ...inputStyle, width: 160 }} placeholder={t("ruleBuilder.valuePlaceholder") || "value"} />
            <button onClick={() => removeCondition(i)} style={dangerBtn} title="Remove">x</button>
          </div>
        ))}
        <button onClick={() => setConditions(prev => [...prev, emptyCondition()])} style={{ ...btnStyle, marginTop: 6 }}>{t("ruleBuilder.addCondition") || "+ Add Condition"}</button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <strong style={{ fontSize: 13 }}>Actions</strong>
        {actions.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
            <Select value={a.type} onChange={v => updateAction(i, "type", v)} style={{ width: 140 }} size="small">
              {ACTION_TYPES.map(actionType => <Select.Option key={actionType} value={actionType}>{t("ruleBuilder.actionLabel." + actionType) || actionType}</Select.Option>)}
            </Select>
            <span style={{ fontSize: 13, color: "#666" }}>→</span>
            <Select value={a.lensOptionId} onChange={v => updateAction(i, "lensOptionId", v)} style={{ width: 220 }} size="small">
              {lensOptions.map(l => <Select.Option key={l.id} value={l.id}>{l.name}{l.variantId ? " (variant: " + l.variantId + ")" : ""}</Select.Option>)}
            </Select>
            <button onClick={() => removeAction(i)} style={dangerBtn} title="Remove">x</button>
          </div>
        ))}
        <button onClick={() => setActions(prev => [...prev, emptyAction()])} style={{ ...btnStyle, marginTop: 6 }}>{t("ruleBuilder.addAction") || "+ Add Action"}</button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, background: "#005bd3", color: "#fff", borderColor: "#005bd3", padding: "6px 18px" }}>
          {saving ? (t("ruleBuilder.saving") || "Saving...") : (t("ruleBuilder.save") || "Save")}
        </button>
        <button onClick={onCancel} style={btnStyle}>{t("ruleBuilder.cancel") || "Cancel"}</button>
      </div>
    </div>
  );
}
