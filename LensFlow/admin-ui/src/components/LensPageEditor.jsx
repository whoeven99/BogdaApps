import React, { useState, useEffect, useRef } from "react";
import { Table, Modal, Form, Input, Switch, Select, Button, Space, Alert, Divider } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, SettingOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";
import LensOptionEditor from "./LensOptionEditor";

const emptyPage = () => ({
  id: "lp_" + Date.now(),
  name: "",
  type: "standard",
  showImages: true,
  showPrices: true,
  allowLogicJumps: false,
  layout: "grid",
  options: [],
});

export default function LensPageEditor({ pages, onChange, nodeRefs }) {
  const { t } = useI18n();

  const LAYOUT_OPTIONS = [
    { label: t("lensPage.layoutGrid") || "Grid", value: "grid" },
    { label: t("lensPage.layoutList") || "List", value: "list" },
    { label: t("lensPage.layoutCard") || "Card", value: "card" },
    { label: t("lensPage.layoutCompact") || "Compact", value: "compact" },
  ];
  const [data, setData] = useState(pages || []);
  const lastEmittedRef = useRef(pages);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [form] = Form.useForm();
  const [tempOptions, setTempOptions] = useState([]);

  useEffect(() => {
    if (pages && pages !== lastEmittedRef.current) {
      setData(pages);
    }
  }, [pages]);

  const syncData = (next) => {
    setData(next);
    lastEmittedRef.current = next;
    if (onChange) onChange(next);
  };

  const openAdd = () => {
    setEditingIndex(null);
    form.resetFields();
    form.setFieldsValue(emptyPage());
    setTempOptions([]);
    setModalOpen(true);
  };

  const openEdit = (record, index) => {
    setEditingIndex(index);
    form.setFieldsValue(record);
    setTempOptions(record.options || []);
    setModalOpen(true);
  };

  const handleDelete = (index) => {
    syncData(data.filter((_, i) => i !== index));
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      const pageData = { ...values, options: tempOptions };
      if (editingIndex !== null) {
        syncData(data.map((item, i) => (i === editingIndex ? pageData : item)));
      } else {
        syncData([...data, pageData]);
      }
      setModalOpen(false);
    });
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const next = [...data];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    syncData(next);
  };

  const moveDown = (index) => {
    if (index === data.length - 1) return;
    const next = [...data];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    syncData(next);
  };

  const toggleColumn = (index, field) => {
    const next = data.map((item, i) => (i === index ? { ...item, [field]: !item[field] } : item));
    syncData(next);
  };

  const columns = [
    {
      title: t("common.order") || "Order",
      key: "order",
      width: 80,
      render: (_, __, index) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={index === 0}
            onClick={() => moveUp(index)}
          />
          <Button
            type="text"
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={index === data.length - 1}
            onClick={() => moveDown(index)}
          />
        </Space>
      ),
    },
    {
      title: t("lensPage.name") || "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("lensPage.type") || "Type",
      dataIndex: "type",
      key: "type",
      width: 120,
    },
    {
      title: t("lensPage.showImages") || "Images",
      dataIndex: "showImages",
      key: "showImages",
      width: 80,
      render: (val, _, index) => (
        <Switch size="small" checked={!!val} onChange={() => toggleColumn(index, "showImages")} />
      ),
    },
    {
      title: t("lensPage.showPrices") || "Prices",
      dataIndex: "showPrices",
      key: "showPrices",
      width: 80,
      render: (val, _, index) => (
        <Switch size="small" checked={!!val} onChange={() => toggleColumn(index, "showPrices")} />
      ),
    },
    {
      title: t("lensPage.logicJumps") || "Logic Jumps",
      dataIndex: "allowLogicJumps",
      key: "allowLogicJumps",
      width: 100,
      render: (val, _, index) => (
        <Switch size="small" checked={!!val} onChange={() => toggleColumn(index, "allowLogicJumps")} />
      ),
    },
    {
      title: t("lensPage.layout") || "Layout",
      dataIndex: "layout",
      key: "layout",
      width: 100,
    },
    {
      title: t("lensOption.addOption") || "Options",
      key: "options",
      width: 80,
      render: (_, record) => (
        <span style={{ fontSize: 12, color: "#999" }}>
          {record.options?.length || 0}
        </span>
      ),
    },
    {
      title: t("common.actions") || "Actions",
      key: "actions",
      width: 100,
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
      <Alert type="info" message={t("lensPage.intro") || "Configure one or more lens selection pages. Each page can display different lens options."} showIcon closable style={{ marginBottom: 12 }} />

      <div className="mb-3">
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          {t("lensPage.addPage") || "Add Lens Page"}
        </Button>
      </div>

      <Table
        dataSource={data}
        columns={columns}
        rowKey={(_, index) => index}
        size="small"
        pagination={false}
        bordered
      />

      <Modal
        title={editingIndex !== null
          ? (t("lensPage.editPage") || "Edit Lens Page")
          : (t("lensPage.addPage") || "Add Lens Page")
        }
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={t("lensPage.name") || "Name"}
            name="name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder={t("lensPage.pageDisplayName") || "Page display name"} />
          </Form.Item>

          <Form.Item
            label={t("lensPage.type") || "Type"}
            name="type"
          >
            <Select
              options={[
                { label: t("lensPage.pageTypeStandard") || "Standard", value: "standard" },
                { label: t("lensPage.pageTypeContactLens") || "Contact Lens", value: "contact_lens" },
              ]}
            />
          </Form.Item>

          <div className="flex flex-wrap gap-4 mb-4">
            <Form.Item
              label={t("lensPage.showImages") || "Show Images"}
              name="showImages"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label={t("lensPage.showPrices") || "Show Prices"}
              name="showPrices"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label={t("lensPage.allowLogicJumps") || "Allow Logic Jumps"}
              name="allowLogicJumps"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </div>

          <Form.Item
            label={t("lensPage.layout") || "Layout"}
            name="layout"
            help={t("lensPage.helpLayout") || "Grid shows products in rows and columns. List shows them vertically. Card uses large cards. Compact minimizes spacing."}
          >
            <Select options={LAYOUT_OPTIONS} />
          </Form.Item>
        </Form>

        <Divider style={{ margin: "12px 0" }} />
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
          {t("lensOption.addOption") || "Lens Options"}
        </div>
        <LensOptionEditor
          options={tempOptions}
          onChange={setTempOptions}
          nodeRefs={nodeRefs}
        />
      </Modal>
    </div>
  );
}
