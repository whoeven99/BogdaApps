import React from "react";
import { Card, Spin, Button, Alert, Typography, Progress, Empty } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useApi } from "../hooks/useApi";
import { useI18n } from "../hooks/useI18n";

const { Title, Text } = Typography;

const BAR_COLORS = ["#005bd3", "#28a745", "#ffc107", "#dc3545", "#6f42c1", "#17a2b8"];

function BarChart({ data, labelKey, valueKey, maxBars = 6 }) {
  const { t } = useI18n();
  const entries = (data || []).slice(0, maxBars);
  const maxVal = Math.max(1, ...entries.map((e) => e[valueKey] || 0));

  if (entries.length === 0) return <Empty description={t("analytics.noData") || "No data yet"} image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
      {entries.map((e, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 80, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {e[labelKey]}
          </span>
          <Progress
            percent={Math.round((e[valueKey] / maxVal) * 100)}
            showInfo={false}
            strokeColor={BAR_COLORS[i % BAR_COLORS.length]}
            size="small"
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 12, color: "#888", minWidth: 30, textAlign: "right" }}>{e[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { data, loading, error, retry } = useApi("/api/admin/analytics");
  const { t } = useI18n();

  if (loading) return <div className="py-10 text-center"><Spin size="large" /></div>;
  if (error) return (
    <div className="py-10">
      <Alert type="error" message={t("analytics.failed")} description={error.message}
        action={<Button size="small" onClick={retry} icon={<ReloadOutlined />}>{t("analytics.retry")}</Button>} />
    </div>
  );

  const statCards = [
    { label: t("analytics.totalFlows"), value: data?.totalFlows || 0 },
    { label: t("analytics.totalPrescriptions"), value: data?.totalPrescriptions || 0 },
    { label: t("analytics.totalBundles"), value: data?.totalBundles || 0 },
    { label: t("analytics.completedBundles"), value: data?.completedBundles || 0 },
  ];

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>{t("analytics.title")}</Title>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((c) => (
          <Card key={c.label} size="small">
            <Text type="secondary" style={{ fontSize: 13 }}>{c.label}</Text>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{c.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title={t("analytics.flowCompletion")}>
          {(data?.flowStats || []).map((fs) => (
            <div key={fs.flowId} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                {fs.name}
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                  ({fs.completed}/{fs.total})
                </Text>
              </div>
              <Progress percent={fs.completionRate} size="small"
                strokeColor={fs.completionRate > 66 ? "#28a745" : fs.completionRate > 33 ? "#ffc107" : "#dc3545"} />
            </div>
          ))}
          {(!data?.flowStats || data.flowStats.length === 0) && <Text type="secondary">{t("analytics.noData")}</Text>}
        </Card>

        <Card title={t("analytics.lensDistribution")}>
          <BarChart data={data?.lensDistribution} labelKey="lensOptionId" valueKey="count" />
        </Card>
      </div>

      <Card title={t("analytics.prescriptionDistribution")} style={{ marginTop: 20 }}>
        <BarChart data={data?.prescriptionDistribution} labelKey="type" valueKey="count" />
      </Card>
    </div>
  );
}