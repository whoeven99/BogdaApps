import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Table, Tag, Button, Space, Popconfirm, message, Alert, Typography, Modal, Radio } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, SendOutlined } from "@ant-design/icons";
import { useApi } from "../hooks/useApi";
import { useMutation } from "../hooks/useMutation";
import { useI18n } from "../hooks/useI18n";

const { Text } = Typography;

export default function Flows() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: flows, loading, error, retry } = useApi("/api/admin/flows");
  const { mutate, loading: saving } = useMutation();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("prescription_first");

  const refresh = () => retry();

  const handleCreate = async (flowType) => {
    try {
      const typeLabel = flowType === "lens_first" ? "Lens First" : "Prescription First";
      const defaultName = typeLabel + " — " + new Date().toLocaleString();
      const resp = await mutate("/api/admin/flows", "POST", { name: defaultName, type: flowType });
      const newFlow = resp?.body || resp;
      message.success(t("flows.created") || "Flow created");
      if (newFlow && newFlow.id) {
        navigate("/flows/" + newFlow.id);
      } else {
        refresh();
      }
    } catch (e) {
      message.error((t("common.failed") || "Failed") + ": " + (e?.message || ""));
    } finally {
      setCreateModalOpen(false);
    }
  };

  const openCreateModal = () => {
    setSelectedType("prescription_first");
    setCreateModalOpen(true);
  };

  const handleDelete = async (id) => {
    await mutate("/api/admin/flows/" + id, "DELETE");
    refresh();
    message.success(t("flows.deleted") || "Flow deleted");
  };

  const handlePublish = async (id) => {
    await mutate("/api/admin/flows/" + id + "/publish", "POST");
    refresh();
    message.success(t("flows.publishedMsg") || "Flow published");
  };

  const columns = [
    {
      title: t("flows.name") || "Name",
      dataIndex: "name",
      key: "name",
      render: (text, record) => <Link to={`/flows/${record.id}`} style={{ fontWeight: 500 }}>{text}</Link>,
    },
    { title: t("flows.type") || "Type", dataIndex: "type", key: "type", render: (t_val) => <Text type="secondary">{t_val}</Text> },
    { title: t("flows.products") || "Products", dataIndex: "productIds", key: "products", render: (ids) => (ids || []).length },
    {
      title: t("flows.status") || "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => {
        const label = s === "published" ? (t("flows.published") || "published") : (t("flows.draft") || "draft");
        return <Tag color={s === "published" ? "green" : "gold"}>{label}</Tag>;
      },
    },
    {
      title: t("flows.actions") || "Actions",
      key: "actions",
      width: 220,
      render: (_, record) => (
        <Space size={4}>
          <Link to={`/flows/${record.id}`}>
            <Button size="small" icon={<EditOutlined />}>{t("flows.edit") || "Edit"}</Button>
          </Link>
          {record.status !== "published" && (
            <Button size="small" icon={<SendOutlined />} onClick={() => handlePublish(record.id)} disabled={saving}>
              {t("flows.publish") || "Publish"}
            </Button>
          )}
          <Popconfirm title={t("flows.deleteConfirm") || "Delete this flow?"} onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} disabled={saving} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (error) return <Alert type="error" message={t("common.failed") || "Failed to load"} description={error.message} action={<Button size="small" onClick={retry}>{t("common.retry") || "Retry"}</Button>} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ margin: 0, fontSize: 24 }}>{t("flows.title") || "Flows"}</h1>
        <Button type="primary" icon={<PlusOutlined />} loading={saving} onClick={openCreateModal}>
          {t("flows.newFlow") || "New Flow"}
        </Button>
      </div>

      <Alert type="info" message={t("flows.intro") || "A Flow is a multi-step form that guides customers through prescription entry and lens selection."} showIcon closable style={{ marginBottom: 16 }} />

      {!loading && flows && flows.length === 0 && (
        <div className="text-center py-10 border rounded-lg bg-white">
          <Text type="secondary" style={{ fontSize: 15, display: "block", marginBottom: 12 }}>{t("flows.noFlowsHint") || "Create your first flow to guide customers through the prescription and lens selection process."}</Text>
          <Button type="primary" icon={<PlusOutlined />} loading={saving} onClick={openCreateModal}>{t("flows.newFlow") || "New Flow"}</Button>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={flows || []}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: t("flows.noFlows") || "No flows found" }}
      />

      <Modal
        title={t("flows.createFlow") || "Create New Flow"}
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => handleCreate(selectedType)}
        okText={t("flows.create") || "Create"}
        cancelText={t("common.cancel") || "Cancel"}
        width={480}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 12 }}>
            {t("flows.selectTypeHint") || "Select the flow type. This determines the default step order for your customers."}
          </Text>
          <Radio.Group
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ width: "100%" }}
          >
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <div
                onClick={() => setSelectedType("prescription_first")}
                style={{
                  padding: "14px 16px",
                  border: selectedType === "prescription_first" ? "2px solid #005bd3" : "2px solid #e5e5e5",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: selectedType === "prescription_first" ? "#f0f7ff" : "#fff",
                }}
              >
                <Radio value="prescription_first" style={{ fontWeight: 600, fontSize: 14 }}>
                  {t("flows.prescriptionFirst") || "Prescription First"}
                </Radio>
                <div style={{ fontSize: 12, color: "#666", marginTop: 6, marginLeft: 24 }}>
                  {t("flows.prescriptionFirstDesc") || "Customer selects prescription type and submits prescription data first, then chooses lenses."}
                </div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 4, marginLeft: 24 }}>
                  {t("flows.prescriptionFirstFlow") || "Flow: Prescription Type → Submit Method → Prescription Form → Choose Lenses → Review"}
                </div>
              </div>

              <div
                onClick={() => setSelectedType("lens_first")}
                style={{
                  padding: "14px 16px",
                  border: selectedType === "lens_first" ? "2px solid #005bd3" : "2px solid #e5e5e5",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: selectedType === "lens_first" ? "#f0f7ff" : "#fff",
                }}
              >
                <Radio value="lens_first" style={{ fontWeight: 600, fontSize: 14 }}>
                  {t("flows.lensFirst") || "Lens First"}
                </Radio>
                <div style={{ fontSize: 12, color: "#666", marginTop: 6, marginLeft: 24 }}>
                  {t("flows.lensFirstDesc") || "Customer selects lens type first, then provides prescription details."}
                </div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 4, marginLeft: 24 }}>
                  {t("flows.lensFirstFlow") || "Flow: Prescription Type → Choose Lenses → Submit Method → Prescription Form → Review"}
                </div>
              </div>
            </Space>
          </Radio.Group>
        </div>
      </Modal>
    </div>
  );
}