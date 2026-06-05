import React, { useState, useEffect, useRef } from "react";
import { Table, Modal, Form, Input, InputNumber, Switch, Select, Button, Space, Tag, Alert, Typography } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined, RightOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";
import { useShopify } from "../hooks/useShopify";

const emptyOption = () => ({
  key: "",
  type: "",
  name: "",
  description: "",
  imageUrl: "",
  price: 0,
  leadsTo: "",
  lensGroupIds: [],
  enabled: true,
  sortOrder: 0,
});

export default function PrescriptionTypeEditor({ options, config, onChange, nodeRefs }) {
  const { t } = useI18n();
  const { Text } = Typography;
  const { authenticatedFetch } = useShopify();
  const [data, setData] = useState(options || []);
  const [configState, setConfigState] = useState(config || { showImages: true, showPrices: true });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [form] = Form.useForm();
  const [lensGroups, setLensGroups] = useState([]);
  const lastEmittedRef = useRef(options);
  const lastConfigRef = useRef(config);

  useEffect(() => {
    (async () => {
      try {
        const res = await authenticatedFetch("/api/admin/lens-options/manage");
        const json = await res.json();
        const list = json?.body || json || [];
        setLensGroups(list.map((g) => ({ label: g.name ? (g.name + " (" + g.id + ")") : g.id, value: g.id })));
      } catch {}
    })();
  }, [authenticatedFetch]);

  const refOptions = (nodeRefs || []).map((ref) => ({
    label: ref,
    value: ref,
  }));

  useEffect(() => {
    if (options && options !== lastEmittedRef.current) {
      setData(options);
    }
  }, [options]);

  useEffect(() => {
    if (config && config !== lastConfigRef.current) {
      setConfigState(config);
    }
  }, [config]);

  const syncData = (next) => {
    setData(next);
    lastEmittedRef.current = next;
    if (onChange) onChange(next, configState);
  };

  const syncConfig = (nextConfig) => {
    setConfigState(nextConfig);
    lastConfigRef.current = nextConfig;
    setData(prev => { if (onChange) onChange(prev, nextConfig); return prev; });
  };

  const openAdd = () => {
    setEditingIndex(null);
    form.resetFields();
    form.setFieldsValue(emptyOption());
    setModalOpen(true);
  };

  const openEdit = (record, index) => {
    setEditingIndex(index);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = (index) => {
    const next = data.filter((_, i) => i !== index);
    syncData(next);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingIndex !== null) {
        const next = data.map((item, i) => (i === editingIndex ? values : item));
        syncData(next);
      } else {
        syncData([...data, values]);
      }
      setModalOpen(false);
    });
  };

  const columns = [
    {
      title: t("prescriptionType.type") || "Type",
      dataIndex: "type",
      key: "type",
      width: 120,
    },
    {
      title: t("prescriptionType.name") || "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("prescriptionType.description") || "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: t("prescriptionType.price") || "Price",
      dataIndex: "price",
      key: "price",
      width: 100,
      render: (val) => (val != null ? `$${val}` : "-"),
    },
    {
      title: t("prescriptionType.lensGroups") || "Lens Groups",
      dataIndex: "lensGroupIds",
      key: "lensGroupIds",
      width: 150,
      render: (ids) => {
        if (!ids || !ids.length) return <Text type="secondary" style={{ fontSize: 12 }}>所有组</Text>;
        const names = ids.map((id) => {
          const found = lensGroups.find((g) => g.value === id);
          return found ? found.label : id;
        });
        if (names.length <= 2) return names.join(", ");
        return <span>{names.slice(0, 2).join(", ")} <Tag style={{ fontSize: 11 }}>+{names.length - 2}</Tag></span>;
      },
    },
    {
      title: t("prescriptionType.leadsTo") || "Leads To",
      dataIndex: "leadsTo",
      key: "leadsTo",
      width: 120,
    },
    {
      title: t("prescriptionType.enabled") || "Enabled",
      dataIndex: "enabled",
      key: "enabled",
      width: 80,
      render: (val) => <Tag color={val ? "green" : "red"}>{val ? (t("lensOption.yes") || "Yes") : (t("lensOption.no") || "No")}</Tag>,
    },
    {
      title: t("common.actions") || "Actions",
      key: "actions",
      width: 120,
      render: (_, record, index) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record, index)}
          />
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(index)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      <Alert type="info" message={t("prescriptionType.intro") || "Define the prescription types that your customers can choose from. Each type can lead to different lens pages."} showIcon closable style={{ marginBottom: 12 }} />

      <div className="mb-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={configState.showImages}
            onChange={(v) => syncConfig({ ...configState, showImages: v })}
          />
          <span className="text-sm">{t("prescriptionType.images") || "Show Images"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={configState.showPrices}
            onChange={(v) => syncConfig({ ...configState, showPrices: v })}
          />
          <span className="text-sm">{t("prescriptionType.prices") || "Show Prices"}</span>
        </div>
        <div className="flex-1" />
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          {t("prescriptionType.addOption") || "Add Prescription Type"}
        </Button>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey={(_, index) => index}
        size="small"
        pagination={false}
        bordered
        expandable={{
          expandedRowRender: (record) => {
            const hasJump = record.leadsTo && record.leadsTo.trim();
            return (
              <div style={{
                background: hasJump ? "#eaf4ff" : "#f6ffed",
                borderRadius: 6,
                padding: "12px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                border: hasJump ? "1px solid #cce0ff" : "1px solid #d9f7be",
              }}>
                <InfoCircleOutlined style={{ color: hasJump ? "#005bd3" : "#52c41a", fontSize: 18, marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: hasJump ? "#003a8c" : "#135200", marginBottom: 2 }}>
                    {hasJump
                      ? (t("prescriptionType.flowHintJump") || "选择此处方后，买家将跳转至 " + record.leadsTo)
                      : (t("prescriptionType.flowHintNext") || "选择此处方后，买家将继续下一步")
                    }
                  </div>
                  <div style={{ fontSize: 12, color: hasJump ? "#5a8ac5" : "#95de64" }}>
                    {hasJump
                      ? (t("prescriptionType.flowHintJumpDetail") || "跳转将绕过中间步骤，直接将买家带到目标页面")
                      : (t("prescriptionType.flowHintNextDetail") || "买家将按照步骤顺序依次完成配镜流程")
                    }
                  </div>
                </div>
              </div>
            );
          },
          rowExpandable: () => true,
        }}
      />

      <Modal
        title={editingIndex !== null
          ? (t("prescriptionType.editOption") || "Edit Prescription Type")
          : (t("prescriptionType.addOption") || "Add Prescription Type")
        }
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={t("prescriptionType.type") || "Type Key"}
            name="type"
            rules={[{ required: true, message: "Type is required" }]}
            help={t("prescriptionType.helpType") || "Internal identifier for this option. Used by logic jumps and backend matching. Example: single_vision"}
          >
            <Input placeholder={t("prescriptionType.typePlaceholder") || "e.g. single_vision, progressive"} />
          </Form.Item>

          <Form.Item
            label={t("prescriptionType.name") || "Name"}
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
            help={t("prescriptionType.helpName") || "Customer-facing label shown on the selection screen. e.g. 'Single Vision' or 'Progressive Lenses'"}
          >
            <Input placeholder={t("prescriptionType.displayName") || "Display name"} />
          </Form.Item>

          <Form.Item
            label={t("prescriptionType.description") || "Description"}
            name="description"
            help={t("prescriptionType.helpDescription") || "Additional text shown to the customer explaining this option. Keep it short and helpful."}
          >
            <Input.TextArea rows={2} placeholder={t("prescriptionType.optionDescription") || "Option description"} />
          </Form.Item>

          <Form.Item
            label={t("prescriptionType.imageUrl") || "Image URL"}
            name="imageUrl"
            help={t("prescriptionType.helpImageUrl") || "An image shown alongside this option for visual reference. Leave empty to show no image."}
          >
            <Input placeholder={t("prescriptionType.imageUrlPlaceholder") || "https://example.com/image.png"} />
          </Form.Item>

          <Form.Item
            label={t("prescriptionType.price") || "Price"}
            name="price"
            help={t("prescriptionType.helpPrice") || "Additional price for this prescription type. Set to 0 if this option has no extra cost."}
          >
            <InputNumber min={0} precision={2} style={{ width: "100%" }} placeholder="0.00" addonBefore="$" />
          </Form.Item>

          <Form.Item label={t("prescriptionType.leadsTo") || "Leads To"} name="leadsTo" help={t("prescriptionType.helpLeadsTo") || "If set, selecting this option will skip to the chosen node instead of proceeding normally."}>
            <Select
              allowClear
              placeholder={t("prescriptionType.selectTarget") || "Select target node ref"}
              options={refOptions}
            />
          </Form.Item>

          <Form.Item
            label={t("prescriptionType.lensGroups") || "Associated Lens Groups"}
            name="lensGroupIds"
            help={t("prescriptionType.helpLensGroups") || "Only the selected lens groups will be shown to customers who choose this prescription type. Leave empty to show all."}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder={t("prescriptionType.lensGroupPlaceholder") || "Select lens groups..."}
              options={lensGroups}
            />
          </Form.Item>

          <Form.Item
            label={t("prescriptionType.enabled") || "Enabled"}
            name="enabled"
            valuePropName="checked"
            help={t("prescriptionType.helpEnabled") || "Turn off to hide this option from customers without deleting it."}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label={t("prescriptionType.sortOrder") || "Sort Order"}
            name="sortOrder"
            help={t("prescriptionType.helpSortOrder") || "Controls display order. Lower numbers appear first."}
          >
            <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}