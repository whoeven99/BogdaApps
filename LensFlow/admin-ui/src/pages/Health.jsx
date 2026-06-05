import React from "react";
import { Collapse, Tag, Spin, Button, Alert, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useApi } from "../hooks/useApi";
import { useI18n } from "../hooks/useI18n";

const { Title, Text } = Typography;

const statusTagColors = { ok: "green", warning: "gold", error: "red" };

function formatDetails(check) {
  if (!check.details) return null;
  const d = check.details;
  const items = [];

  if (d.orphanFlows && d.orphanFlows.length > 0) {
    items.push(d.orphanFlows.length + " orphan flow(s) without product assignment");
  }
  if (d.issues && d.issues.length > 0) {
    items.push(...d.issues);
  }
  if (d.incomplete && d.incomplete.length > 0) {
    items.push(d.incomplete.length + " incomplete prescription(s)");
  }
  if (d.staleCount > 0) {
    items.push(d.staleCount + " stale bundle(s) older than 24 hours");
  }

  if (items.length === 0) return null;

  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 3, fontSize: 13, color: "#666" }}>{item}</li>
      ))}
    </ul>
  );
}

export default function Health() {
  const { data, loading, error, retry } = useApi("/health");
  const { t } = useI18n();
  const statusLabels = {
    ok: t("health.ok") || "Healthy",
    warning: t("health.warning") || "Needs Attention",
    error: t("health.error") || "Critical",
  };

  if (loading) return <div className="py-10 text-center"><Spin size="large" /></div>;
  if (error) return (
    <div className="py-10">
      <Alert
        type="error"
        message={t("health.failed")}
        description={error.message}
        action={<Button size="small" onClick={retry} icon={<ReloadOutlined />}>{t("health.retry")}</Button>}
      />
    </div>
  );

  const checks = data?.checks || [];
  const overall = data?.status || "warning";

  const items = checks.map((check) => ({
    key: check.id,
    label: (
      <div className="flex items-center gap-3">
        <span style={{
          width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
          background: check.status === "ok" ? "#28a745" : check.status === "warning" ? "#ffc107" : "#dc3545",
        }} />
        <span style={{ fontWeight: 600, flex: 1 }}>{check.name}</span>
        <Tag color={statusTagColors[check.status] || "default"}>{statusLabels[check.status] || check.status}</Tag>
      </div>
    ),
    children: (
      <div>
        <Text type="secondary">{check.message}</Text>
        {formatDetails(check)}
      </div>
    ),
  }));

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>{t("health.title")}</Title>

      <div className="flex items-center gap-3 mb-5">
        <Text type="secondary">{t("health.overallStatus")}:</Text>
        <Tag color={statusTagColors[overall] || "gold"} style={{ fontWeight: 600, fontSize: 14, padding: "4px 14px" }}>
          {statusLabels[overall] || overall}
        </Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t("health.updated") || "Updated:"} {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "-"}
        </Text>
      </div>

      {items.length > 0 ? (
        <Collapse items={items} />
      ) : (
        <Text type="secondary">{t("health.noChecks") || "No health checks available"}</Text>
      )}
    </div>
  );
}