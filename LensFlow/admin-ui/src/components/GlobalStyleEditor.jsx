import React from "react";
import { Collapse, Form, Input, InputNumber, ColorPicker, Typography, Row, Col } from "antd";
import { useI18n } from "../hooks/useI18n";

const { Text } = Typography;

function renderPageStyles(styles, onChange, t) {
  const page = styles?.page || {};
  const set = (k, v) => onChange({ ...styles, page: { ...page, [k]: v } });
  return (
    <Collapse.Panel header={t("styles.pageStyles") || "Page Styles"} key="page">
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.zIndex") || "zIndex"}>
            <InputNumber value={page.zIndex} onChange={(v) => set("zIndex", v)} placeholder="1000" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.maxWidth") || "Max Width (px)"}>
            <InputNumber value={page.maxWidth} onChange={(v) => set("maxWidth", v)} placeholder="800" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.padding") || "Padding"}>
            <Input value={page.padding} onChange={(e) => set("padding", e.target.value)} placeholder="24px" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.margin") || "Margin"}>
            <Input value={page.margin} onChange={(e) => set("margin", e.target.value)} placeholder="0 auto" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.backgroundColor") || "Background Color"}>
            <ColorPicker value={page.backgroundColor} onChange={(color) => set("backgroundColor", color.toHexString())} showText />
          </Form.Item>
        </Col>
      </Row>
    </Collapse.Panel>
  );
}

function renderTitleStyles(styles, onChange, t) {
  const title = styles?.title || {};
  const subtitle = styles?.subtitle || {};
  const set = (k, v) => onChange({ ...styles, title: { ...title, [k]: v } });
  const setSub = (k, v) => onChange({ ...styles, subtitle: { ...subtitle, [k]: v } });
  return (
    <Collapse.Panel header={t("styles.titleStyles") || "Title & Subtitle Styles"} key="title">
      <Text strong style={{ fontSize: 13 }}>{t("styles.title") || "Title"}</Text>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.fontFamily") || "Font Family"}>
            <Input value={title.fontFamily} onChange={(e) => set("fontFamily", e.target.value)} placeholder="inherit" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.fontSize") || "Font Size (px)"}>
            <InputNumber value={title.fontSize} onChange={(v) => set("fontSize", v)} placeholder="24" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.fontWeight") || "Font Weight"}>
            <InputNumber value={title.fontWeight} onChange={(v) => set("fontWeight", v)} placeholder="700" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.color") || "Color"}>
            <ColorPicker value={title.color} onChange={(c) => set("color", c.toHexString())} showText />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.marginBottom") || "Margin Bottom (px)"}>
            <InputNumber value={title.marginBottom} onChange={(v) => set("marginBottom", v)} placeholder="16" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
      <Text strong style={{ fontSize: 13 }}>{t("styles.subtitle") || "Subtitle"}</Text>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.fontFamily") || "Font Family"}>
            <Input value={subtitle.fontFamily} onChange={(e) => setSub("fontFamily", e.target.value)} placeholder="inherit" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.fontSize") || "Font Size (px)"}>
            <InputNumber value={subtitle.fontSize} onChange={(v) => setSub("fontSize", v)} placeholder="16" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.fontWeight") || "Font Weight"}>
            <InputNumber value={subtitle.fontWeight} onChange={(v) => setSub("fontWeight", v)} placeholder="400" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.color") || "Color"}>
            <ColorPicker value={subtitle.color} onChange={(c) => setSub("color", c.toHexString())} showText />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.marginBottom") || "Margin Bottom (px)"}>
            <InputNumber value={subtitle.marginBottom} onChange={(v) => setSub("marginBottom", v)} placeholder="8" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
    </Collapse.Panel>
  );
}

function renderOptionStyles(styles, onChange, t) {
  const option = styles?.option || {};
  const badge = option.badge || {};
  const price = option.price || {};
  const set = (k, v) => onChange({ ...styles, option: { ...option, [k]: v } });
  const setBadge = (k, v) => onChange({ ...styles, option: { ...option, badge: { ...badge, [k]: v } } });
  const setPrice = (k, v) => onChange({ ...styles, option: { ...option, price: { ...price, [k]: v } } });
  return (
    <Collapse.Panel header={t("styles.optionStyles") || "Option Styles"} key="option">
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.borderColor") || "Border Color"}>
            <ColorPicker value={option.borderColor} onChange={(c) => set("borderColor", c.toHexString())} showText />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.borderWidth") || "Border Width (px)"}>
            <InputNumber value={option.borderWidth} onChange={(v) => set("borderWidth", v)} placeholder="1" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.borderRadius") || "Border Radius (px)"}>
            <InputNumber value={option.borderRadius} onChange={(v) => set("borderRadius", v)} placeholder="8" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.backgroundColor") || "Background Color"}>
            <ColorPicker value={option.backgroundColor} onChange={(c) => set("backgroundColor", c.toHexString())} showText />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.textColor") || "Text Color"}>
            <ColorPicker value={option.textColor} onChange={(c) => set("textColor", c.toHexString())} showText />
          </Form.Item>
        </Col>
      </Row>
      <Text strong style={{ fontSize: 13 }}>{t("styles.badge") || "Badge"}</Text>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.badgeBackground") || "Badge Background"}>
            <ColorPicker value={badge.background} onChange={(c) => setBadge("background", c.toHexString())} showText />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.badgeColor") || "Badge Color"}>
            <ColorPicker value={badge.color} onChange={(c) => setBadge("color", c.toHexString())} showText />
          </Form.Item>
        </Col>
      </Row>
      <Text strong style={{ fontSize: 13 }}>{t("styles.price") || "Price"}</Text>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.priceColor") || "Price Color"}>
            <ColorPicker value={price.color} onChange={(c) => setPrice("color", c.toHexString())} showText />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.priceFontSize") || "Price Font Size"}>
            <InputNumber value={price.fontSize} onChange={(v) => setPrice("fontSize", v)} placeholder="16" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.priceFontWeight") || "Price Font Weight"}>
            <InputNumber value={price.fontWeight} onChange={(v) => setPrice("fontWeight", v)} placeholder="600" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
    </Collapse.Panel>
  );
}

function renderProgressBarStyles(styles, onChange, t) {
  const pb = styles?.progressBar || {};
  const set = (k, v) => onChange({ ...styles, progressBar: { ...pb, [k]: v } });
  return (
    <Collapse.Panel header={t("styles.progressBar") || "Progress Bar"} key="progressBar">
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.baseColor") || "Base Color"}>
            <ColorPicker value={pb.baseColor} onChange={(c) => set("baseColor", c.toHexString())} showText />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.highlightColor") || "Highlight Color"}>
            <ColorPicker value={pb.highlightColor} onChange={(c) => set("highlightColor", c.toHexString())} showText />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.height") || "Height (px)"}>
            <InputNumber value={pb.height} onChange={(v) => set("height", v)} placeholder="4" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
    </Collapse.Panel>
  );
}

function renderButtonStyles(styles, onChange, key, label, t) {
  const btn = styles?.[key] || {};
  const set = (k, v) => onChange({ ...styles, [key]: { ...btn, [k]: v } });
  return (
    <Collapse.Panel header={label} key={key}>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.fontFamily") || "Font Family"}>
            <Input value={btn.fontFamily} onChange={(e) => set("fontFamily", e.target.value)} placeholder="inherit" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.fontSize") || "Font Size (px)"}>
            <InputNumber value={btn.fontSize} onChange={(v) => set("fontSize", v)} placeholder="14" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.fontWeight") || "Font Weight"}>
            <InputNumber value={btn.fontWeight} onChange={(v) => set("fontWeight", v)} placeholder="600" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.color") || "Color"}>
            <ColorPicker value={btn.color} onChange={(c) => set("color", c.toHexString())} showText />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.backgroundColor") || "Background Color"}>
            <ColorPicker value={btn.backgroundColor} onChange={(c) => set("backgroundColor", c.toHexString())} showText />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.borderColor") || "Border Color"}>
            <ColorPicker value={btn.borderColor} onChange={(c) => set("borderColor", c.toHexString())} showText />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={t("styles.borderRadius") || "Border Radius (px)"}>
            <InputNumber value={btn.borderRadius} onChange={(v) => set("borderRadius", v)} placeholder="6" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.paddingH") || "Padding H (px)"}>
            <InputNumber value={btn.paddingH} onChange={(v) => set("paddingH", v)} placeholder="24" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={t("styles.paddingV") || "Padding V (px)"}>
            <InputNumber value={btn.paddingV} onChange={(v) => set("paddingV", v)} placeholder="10" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
    </Collapse.Panel>
  );
}

export default function GlobalStyleEditor({ styles, onChange }) {
  const { t } = useI18n();
  const s = styles || {};
  const handleChange = (updated) => {
    if (onChange) onChange(updated);
  };

  return (
    <div className="p-4">
      <Collapse defaultActiveKey={["page"]} style={{ background: "#fff" }}>
        {renderPageStyles(s, handleChange, t)}
        {renderTitleStyles(s, handleChange, t)}
        {renderOptionStyles(s, handleChange, t)}
        {renderProgressBarStyles(s, handleChange, t)}
        {renderButtonStyles(s, handleChange, "addToCartBtn", t("styles.addToCartBtn") || "Add To Cart Button", t)}
        {renderButtonStyles(s, handleChange, "nextBtn", t("styles.nextBtn") || "Next Button", t)}
        {renderButtonStyles(s, handleChange, "confirmBtn", t("styles.confirmBtn") || "Confirm Button", t)}
      </Collapse>
    </div>
  );
}
