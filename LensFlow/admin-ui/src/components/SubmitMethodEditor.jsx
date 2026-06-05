import React, { useState, useEffect } from "react";
import { Table, Modal, Form, Input, Select, Switch, Button, Space, Typography, Alert } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";

const { Text } = Typography;

const emptyMethod = () => ({
  id: "",
  type: "manual",
  name: "",
  description: "",
  leadsTo: "",
  enabled: true,
});

export default function SubmitMethodEditor({ options, config, onChange }) {
  const { t } = useI18n();
  const [allowManual, setAllowManual] = useState(config?.allowManual ?? true);
  const [allowUpload, setAllowUpload] = useState(config?.allowUpload ?? true);
  const [allowLater, setAllowLater] = useState(config?.allowLater ?? true);
  const [methods, setMethods] = useState(options || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (config) {
      setAllowManual(config.allowManual ?? true);
      setAllowUpload(config.allowUpload ?? true);
      setAllowLater(config.allowLater ?? true);
    }
    if (options) {
      setMethods(options);
    }
  }, [options, config]);

  const emit = (opts, cfg) => {
    onChange({ options: opts, config: cfg });
  };

  const handleToggle = (key) => {
    let updated;
    if (key === "allowManual") {
      const next = !allowManual;
      setAllowManual(next);
      updated = { allowManual: next, allowUpload, allowLater };
    } else if (key === "allowUpload") {
      const next = !allowUpload;
      setAllowUpload(next);
      updated = { allowManual, allowUpload: next, allowLater };
    } else {
      const next = !allowLater;
      setAllowLater(next);
      updated = { allowManual, allowUpload, allowLater: next };
    }
    emit(methods, updated);
  };

  const openNew = () => {
    setEditingIndex(null);
    form.resetFields();
    form.setFieldsValue(emptyMethod());
    setModalOpen(true);
  };

  const openEdit = (index) => {
    setEditingIndex(index);
    form.setFieldsValue(methods[index]);
    setModalOpen(true);
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      const updated = [...methods];
      if (editingIndex !== null) {
        updated[editingIndex] = values;
      } else {
        updated.push(values);
      }
      setMethods(updated);
      emit(updated, { allowManual, allowUpload, allowLater });
      setModalOpen(false);
    });
  };

  const handleDelete = (index) => {
    const updated = methods.filter((_, i) => i !== index);
    setMethods(updated);
    emit(updated, { allowManual, allowUpload, allowLater });
  };

  const handleToggleMethodEnable = (index) => {
    const updated = methods.map((m, i) => i === index ? { ...m, enabled: !m.enabled } : m);
    setMethods(updated);
    emit(updated, { allowManual, allowUpload, allowLater });
  };

  const columns = [
    { title: t("submitMethod.type") || "Type", dataIndex: "type", key: "type", width: 100,
      render: (txt) => <Text type="secondary">{txt}</Text> },
    { title: t("submitMethod.name") || "Name", dataIndex: "name", key: "name" },
    {
      title: t("submitMethod.jumpTo") || "Jump To",
      dataIndex: "leadsTo",
      key: "leadsTo",
      render: (v) => v || "\u2014",
    },
    {
      title: t("submitMethod.enabled") || "Enabled",
      dataIndex: "enabled",
      key: "enabled",
      width: 80,
      render: (v, _, i) => <Switch size="small" checked={v} onChange={() => handleToggleMethodEnable(i)} />,
    },
    {
      title: "",
      key: "ops",
      width: 80,
      render: (_, __, i) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(i)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(i)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Alert type="info" message={t("submitMethod.intro") || "How should customers provide their prescription? Enable or disable submission methods globally below."} showIcon closable style={{ marginBottom: 12 }} />

      <div className="mb-3">
        <Text strong style={{ fontSize: 13 }}>{t("submitMethod.globalToggles") || "Global Toggles"}</Text>
        <div className="flex gap-6 mt-2">
          <div className="flex items-center gap-2">
            <Switch size="small" checked={allowManual} onChange={() => handleToggle("allowManual")} /> {t("submitMethod.manual") || "Manual"}
          </div>
          <div className="flex items-center gap-2">
            <Switch size="small" checked={allowUpload} onChange={() => handleToggle("allowUpload")} /> {t("submitMethod.upload") || "Upload"}
          </div>
          <div className="flex items-center gap-2">
            <Switch size="small" checked={allowLater} onChange={() => handleToggle("allowLater")} /> {t("submitMethod.later") || "Fill Later"}
          </div>
        </div>
      </div>

      <div className="mb-2 flex justify-between items-center">
        <Text strong style={{ fontSize: 13 }}>{t("submitMethod.methodOptions") || "Method Options"}</Text>
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openNew}>
          {t("submitMethod.add") || "Add"}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={methods}
        rowKey={(_, i) => String(i)}
        pagination={false}
        size="small"
        locale={{ emptyText: t("submitMethod.noMethods") || "No method options defined" }}
      />

      <Modal
        title={editingIndex !== null ? (t("submitMethod.editMethod") || "Edit Method") : (t("submitMethod.newMethod") || "New Method")}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        width={420}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label={t("submitMethod.type") || "Type"} rules={[{ required: true }]}>
            <Select>
              <Select.Option value="manual">{t("submitMethod.manual") || "Manual"}</Select.Option>
              <Select.Option value="upload">{t("submitMethod.upload") || "Upload"}</Select.Option>
              <Select.Option value="later">{t("submitMethod.later") || "Fill Later"}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="name" label={t("submitMethod.name") || "Name"}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t("submitMethod.description") || "Description"}>
            <Input />
          </Form.Item>
          <Form.Item name="leadsTo" label={t("submitMethod.jumpToOptional") || "Jump To (optional)"}>
            <Input />
          </Form.Item>
          <Form.Item name="enabled" label={t("submitMethod.enabled") || "Enabled"} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
