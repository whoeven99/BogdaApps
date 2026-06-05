import React, { useState, useEffect } from "react";
import { Table, Form, Input, InputNumber, Select, Modal, Tag, Button, Space, Typography, Row, Col } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";

const { Text } = Typography;

const emptyPower = () => ({ value: 0 });

export default function ContactLensFormEditor({ formConfig, onChange }) {
  const { t } = useI18n();
  const [config, setConfig] = useState(formConfig || {});
  const [powerModalOpen, setPowerModalOpen] = useState(false);
  const [editingPowerIndex, setEditingPowerIndex] = useState(null);
  const [powerValue, setPowerValue] = useState(0);

  useEffect(() => {
    if (formConfig) {
      setConfig(formConfig);
    }
  }, [formConfig]);

  const sync = (next) => {
    setConfig(next);
    if (onChange) onChange(next);
  };

  const setPower = (key, value) => {
    sync({ ...config, power: { ...(config.power || {}), [key]: value } });
  };

  const setBaseCurve = (values) => {
    sync({ ...config, baseCurve: { ...(config.baseCurve || {}), values } });
  };

  const setDiameter = (values) => {
    sync({ ...config, diameter: { ...(config.diameter || {}), values } });
  };

  const setQuantity = (key, value) => {
    sync({ ...config, quantity: { ...(config.quantity || {}), [key]: value } });
  };

  const powerValues = config.power?.values || [];

  const openAddPower = () => {
    setEditingPowerIndex(null);
    setPowerValue(0);
    setPowerModalOpen(true);
  };

  const openEditPower = (index) => {
    setEditingPowerIndex(index);
    setPowerValue(powerValues[index]);
    setPowerModalOpen(true);
  };

  const handleDeletePower = (index) => {
    const next = powerValues.filter((_, i) => i !== index);
    setPower("values", next);
  };

  const handlePowerModalOk = () => {
    if (editingPowerIndex !== null) {
      const next = powerValues.map((v, i) => (i === editingPowerIndex ? powerValue : v));
      setPower("values", next);
    } else {
      setPower("values", [...powerValues, powerValue]);
    }
    setPowerModalOpen(false);
  };

  const handleAddTag = (type, value) => {
    if (!value) return;
    const existing = config[type]?.values || [];
    if (existing.includes(value)) return;
    if (type === "baseCurve") setBaseCurve([...existing, value]);
    if (type === "diameter") setDiameter([...existing, value]);
  };

  const handleRemoveTag = (type, value) => {
    const existing = config[type]?.values || [];
    if (type === "baseCurve") setBaseCurve(existing.filter((v) => v !== value));
    if (type === "diameter") setDiameter(existing.filter((v) => v !== value));
  };

  const powerColumns = [
    {
      title: t("contactLensForm.powerValue") || "Power Value",
      dataIndex: "value",
      key: "value",
      render: (val) => <Text>{val}</Text>,
    },
    {
      title: t("contactLensForm.actions") || "Actions",
      key: "actions",
      width: 120,
      render: (_, __, index) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditPower(index)} />
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeletePower(index)} />
        </Space>
      ),
    },
  ];

  const powerDataSource = powerValues.map((v, i) => ({ key: i, value: v }));

  return (
    <div className="p-4">
      <Form layout="vertical">
        <Form.Item label={t("contactLensForm.formName") || "Form Name"}>
          <Input
            value={config.name || ""}
            onChange={(e) => sync({ ...config, name: e.target.value })}
            placeholder={t("contactLensForm.formNamePlaceholder") || "Contact Lens Form"}
          />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 14 }}>{t("contactLensForm.power") || "Power Configuration"}</Text>
        </div>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label={t("contactLensForm.powerMin") || "Min"}>
              <InputNumber
                value={config.power?.min}
                onChange={(v) => setPower("min", v)}
                placeholder="-20"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={t("contactLensForm.powerMax") || "Max"}>
              <InputNumber
                value={config.power?.max}
                onChange={(v) => setPower("max", v)}
                placeholder="20"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={t("contactLensForm.powerStep") || "Step"}>
              <InputNumber
                value={config.power?.step}
                onChange={(v) => setPower("step", v)}
                placeholder="0.25"
                step={0.25}
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text strong style={{ fontSize: 14 }}>{t("contactLensForm.powerValues") || "Power Values"}</Text>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddPower}>
              {t("contactLensForm.addValue") || "Add Value"}
            </Button>
          </div>
        </div>

        <Table
          dataSource={powerDataSource}
          columns={powerColumns}
          rowKey="key"
          size="small"
          pagination={false}
          bordered
          style={{ marginBottom: 16 }}
          locale={{ emptyText: t("contactLensForm.noPowerValues") || "No power values defined" }}
        />

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label={<span>{t("contactLensForm.baseCurve") || "Base Curve Values"}<br /><Text type="secondary" style={{ fontSize: 11 }}>{t("contactLensForm.helpBaseCurve") || "Base curve (BC) values control how the lens fits on the eye. Type a value and press Enter to add it."}</Text></span>}>
              <Select
                mode="tags"
                value={config.baseCurve?.values || []}
                onChange={(values) => setBaseCurve(values)}
                placeholder={t("contactLensForm.typeAndEnter") || "Type and press Enter"}
                style={{ width: "100%" }}
                tokenSeparators={[","]}
                notFoundContent={null}
              />
            </Form.Item>
            {(config.baseCurve?.values || []).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {config.baseCurve.values.map((v) => (
                  <Tag
                    key={v}
                    closable
                    onClose={() => handleRemoveTag("baseCurve", v)}
                    style={{ marginBottom: 4 }}
                  >
                    {v}
                  </Tag>
                ))}
              </div>
            )}
          </Col>
          <Col span={12}>
            <Form.Item label={<span>{t("contactLensForm.diameter") || "Diameter Values"}<br /><Text type="secondary" style={{ fontSize: 11 }}>{t("contactLensForm.helpDiameter") || "Diameter (DIA) values specify the lens width in millimeters. Type a value and press Enter to add it."}</Text></span>}>
              <Select
                mode="tags"
                value={config.diameter?.values || []}
                onChange={(values) => setDiameter(values)}
                placeholder={t("contactLensForm.typeAndEnter") || "Type and press Enter"}
                style={{ width: "100%" }}
                tokenSeparators={[","]}
                notFoundContent={null}
              />
            </Form.Item>
            {(config.diameter?.values || []).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {config.diameter.values.map((v) => (
                  <Tag
                    key={v}
                    closable
                    onClose={() => handleRemoveTag("diameter", v)}
                    style={{ marginBottom: 4 }}
                  >
                    {v}
                  </Tag>
                ))}
              </div>
            )}
          </Col>
        </Row>

        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 14 }}>{t("contactLensForm.quantityConfig") || "Quantity Configuration"}</Text>
        </div>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label={t("contactLensForm.quantityMin") || "Min"}>
              <InputNumber
                value={config.quantity?.min}
                onChange={(v) => setQuantity("min", v)}
                placeholder="1"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={t("contactLensForm.quantityMax") || "Max"}>
              <InputNumber
                value={config.quantity?.max}
                onChange={(v) => setQuantity("max", v)}
                placeholder="12"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={t("contactLensForm.quantityDefault") || "Default"}>
              <InputNumber
                value={config.quantity?.default}
                onChange={(v) => setQuantity("default", v)}
                placeholder="1"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <Modal
        title={editingPowerIndex !== null ? (t("contactLensForm.editPowerValue") || "Edit Power Value") : (t("contactLensForm.addPowerValue") || "Add Power Value")}
        open={powerModalOpen}
        onOk={handlePowerModalOk}
        onCancel={() => setPowerModalOpen(false)}
        destroyOnClose
      >
        <Form layout="vertical">
          <Form.Item label={t("contactLensForm.powerValue") || "Power Value"}>
            <InputNumber
              value={powerValue}
              onChange={(v) => setPowerValue(v)}
              step={0.25}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
