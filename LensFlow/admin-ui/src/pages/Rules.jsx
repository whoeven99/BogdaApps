import React, { useState } from "react";
import { Table, Tag, Button, Space, Popconfirm, Alert, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useApi } from "../hooks/useApi";
import { useMutation } from "../hooks/useMutation";
import { useI18n } from "../hooks/useI18n";
import RuleBuilder from "../components/RuleBuilder";

export default function Rules() {
  const { t } = useI18n();
  const { data: rules, loading, error, retry } = useApi("/api/admin/lens-rules");
  const { mutate, loading: saving } = useMutation();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const refresh = () => retry();

  const handleCreate = async (data) => {
    await mutate("/api/admin/lens-rules", "POST", data);
    setShowBuilder(false);
    refresh();
  };

  const handleUpdate = async (data) => {
    await mutate("/api/admin/lens-rules/" + editingRule.id, "PUT", data);
    setEditingRule(null);
    refresh();
  };

  const handleDelete = async (id) => {
    await mutate("/api/admin/lens-rules/" + id, "DELETE");
    refresh();
  };

  const handleToggle = async (rule) => {
    await mutate("/api/admin/lens-rules/" + rule.id, "PUT", { ...rule, enabled: !rule.enabled });
    refresh();
  };

  const columns = [
    { title: t("rules.name") || "Name", dataIndex: "name", key: "name", render: (val) => <strong>{val}</strong> },
    { title: t("rules.priority") || "Priority", dataIndex: "priority", key: "priority", width: 80 },
    {
      title: t("rules.conditions") || "Conditions",
      dataIndex: "conditions",
      key: "conditions",
      render: (conds) => (
        <span style={{ fontSize: 13, color: "#888" }}>
          {(conds || []).map((c) => `${c.field} ${c.operator} ${c.value}`).join(", ") || "\u2014"}
        </span>
      ),
    },
    {
      title: t("rules.actions") || "Actions",
      dataIndex: "actions",
      key: "actions_column",
      render: (acts) => (
        <span style={{ fontSize: 13, color: "#888" }}>
          {(acts || []).map((a) => `${a.type} \u2192 ${a.lensOptionId}`).join(", ") || "\u2014"}
        </span>
      ),
    },
    {
      title: t("rules.status") || "Status",
      dataIndex: "enabled",
      key: "enabled",
      width: 100,
      render: (enabled) => <Tag color={enabled ? "green" : "default"}>{enabled ? (t("rules.enabled") || "Enabled") : (t("rules.disabled") || "Disabled")}</Tag>,
    },
    {
      title: t("rules.actionsColumn") || "Actions",
      key: "ops",
      width: 200,
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" onClick={() => { setEditingRule(record); setShowBuilder(false); }}>{t("rules.edit") || "Edit"}</Button>
          <Button size="small" onClick={() => handleToggle(record)} disabled={saving}>
            {record.enabled ? (t("rules.disable") || "Disable") : (t("rules.enable") || "Enable")}
          </Button>
          <Popconfirm title={t("rules.deleteConfirm") || "Delete this rule?"} onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger disabled={saving}>{t("rules.delete") || "Delete"}</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (error) return <Alert type="error" message={t("common.failed") || "Failed to load"} description={error.message} action={<Button size="small" onClick={retry}>{t("common.retry") || "Retry"}</Button>} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ margin: 0, fontSize: 24 }}>{t("rules.title") || "Lens Rules"}</h1>
        <Button
          type={showBuilder ? "default" : "primary"}
          icon={showBuilder ? null : <PlusOutlined />}
          onClick={() => { setShowBuilder(!showBuilder); setEditingRule(null); }}
        >
          {showBuilder ? t("rules.cancel") || "Cancel" : t("rules.newRule") || "New Rule"}
        </Button>
      </div>

      <Alert type="info" message={t("rules.intro") || "Lens Rules automatically filter and assign lens options based on prescription data and customer selections."} showIcon closable style={{ marginBottom: 16 }} />

      {showBuilder && (
        <RuleBuilder onSave={handleCreate} onCancel={() => setShowBuilder(false)} saving={saving} />
      )}

      {editingRule && (
        <div style={{ marginTop: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t("rules.editing") || "Editing:"} {editingRule.name}</div>
          <RuleBuilder initial={editingRule} onSave={handleUpdate} onCancel={() => setEditingRule(null)} saving={saving} />
        </div>
      )}

      <Table
        columns={columns}
        dataSource={rules || []}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: t("rules.noRules") || "No rules defined" }}
      />
    </div>
  );
}