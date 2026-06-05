import React from "react";
import { Card, Spin, Button, Alert, Typography, Tooltip } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useApi } from "../hooks/useApi";
import { useI18n } from "../hooks/useI18n";

const { Title, Text } = Typography;

export default function Dashboard() {
  const { data: h, loading, error, retry } = useApi("/health");
  const { t } = useI18n();

  if (loading) return <div className="py-10 text-center"><Spin size="large" /></div>;
  if (error) return (
    <div className="py-10">
      <Alert
        type="error"
        message={t("dashboard.failed")}
        description={error.message}
        action={<Button size="small" onClick={retry} icon={<ReloadOutlined />}>{t("dashboard.retry")}</Button>}
      />
    </div>
  );

  const overall = h?.status || "ok";
  const warningCount = (h?.checks || []).filter(c => c.status !== "ok").length;

  const stats = [
    { label: t("dashboard.flows"), value: h?.store?.flows ?? "-" },
    { label: t("dashboard.rules"), value: h?.store?.rules ?? "-" },
    { label: t("dashboard.prescriptions"), value: h?.store?.prescriptions ?? "-" },
    { label: t("dashboard.uptime"), value: h?.uptime ? Math.round(h.uptime) + "s" : "-" },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>{t("dashboard.title")}</Title>

      <Alert
        type="info"
        message={t("dashboard.intro")}
        showIcon
        closable
        style={{ marginBottom: 16 }}
      />

      {warningCount > 0 && (
        <Alert
          type={overall === "error" ? "error" : "warning"}
          message={t("dashboard.warningCount").replace("{count}", warningCount) || warningCount + " health check(s) need attention"}
          action={<a href="#/health" style={{ fontWeight: 600 }}>{t("dashboard.viewDetails") || "view details"}</a>}
          showIcon
          style={{ marginBottom: 18 }}
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(c => (
          <Card key={c.label} size="small">
            <Text type="secondary" style={{ fontSize: 13 }}>{c.label}</Text>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{c.value}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}