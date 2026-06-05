import React from "react";
import { Form, Input, Select, Switch, Alert, Button, Space, Typography, Tooltip } from "antd";
import { CopyOutlined, CrownOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";

const { Text } = Typography;

export default function GlobalSettingsEditor({ settings, onChange }) {
  const { t } = useI18n();
  const s = settings || {};

  const set = (key, value) => {
    if (onChange) onChange({ ...s, [key]: value });
  };

  const handleCopyFlowKey = () => {
    if (s.flowKey) {
      navigator.clipboard.writeText(s.flowKey).then(() => {});
    }
  };

  const TEMPLATES = [
    { label: t("settings.templateDefault") || "Default", value: "default" },
    { label: t("settings.templateMinimal") || "Minimal", value: "minimal" },
    { label: t("settings.templateRounded") || "Rounded", value: "rounded" },
    { label: t("settings.templateFullWidth") || "Full Width", value: "full_width" },
  ];

  const ADD_TO_CART_OPTIONS = [
    { label: t("settings.atcRedirectCart") || "Redirect to Cart", value: "redirect_cart" },
    { label: t("settings.atcRedirectCheckout") || "Redirect to Checkout", value: "redirect_checkout" },
    { label: t("settings.atcStay") || "Stay on Page", value: "stay" },
  ];

  const LAYOUT_OPTIONS = [
    { label: t("settings.layoutModal") || "Modal (Popup)", value: "modal" },
    { label: t("settings.layoutHorizontal") || "Horizontal Split", value: "horizontal" },
    { label: t("settings.layoutInline") || "Inline (Embedded)", value: "inline" },
    { label: t("settings.layoutDrawer") || "Drawer (Slide-in)", value: "drawer" },
  ];

  const BUTTON_MODE_OPTIONS = [
    { label: t("settings.buttonModeAppend") || "Append (Next to Add to Cart)", value: "append" },
    { label: t("settings.buttonModeReplace") || "Replace Add to Cart", value: "replace" },
  ];

  const DISPLAY_MODE_OPTIONS = [
    { label: t("settings.displayAlways") || "Always show", value: "always" },
    { label: t("settings.displayVariant") || "Per variant", value: "variant" },
    { label: t("settings.displayTag") || "Per product tag", value: "tag" },
    { label: t("settings.displayCollection") || "Per collection", value: "collection" },
  ];

  const ANIMATIONS = [
    { label: t("settings.animNone") || "None", value: "none" },
    { label: t("settings.animFadeIn") || "Fade In", value: "fadeIn" },
    { label: t("settings.animSlideInLeft") || "Slide In Left", value: "slideInLeft" },
    { label: t("settings.animSlideInRight") || "Slide In Right", value: "slideInRight" },
    { label: t("settings.animSlideInUp") || "Slide In Up", value: "slideInUp" },
    { label: t("settings.animSlideInDown") || "Slide In Down", value: "slideInDown" },
    { label: t("settings.animZoomIn") || "Zoom In", value: "zoomIn" },
    { label: t("settings.animBounceIn") || "Bounce In", value: "bounceIn" },
    { label: t("settings.animFlipInX") || "Flip In X", value: "flipInX" },
    { label: t("settings.animFlipInY") || "Flip In Y", value: "flipInY" },
    { label: t("settings.animLightSpeedIn") || "Light Speed In", value: "lightSpeedIn" },
    { label: t("settings.animRotateIn") || "Rotate In", value: "rotateIn" },
    { label: t("settings.animRollIn") || "Roll In", value: "rollIn" },
    { label: t("settings.animJackInTheBox") || "Jack In The Box", value: "jackInTheBox" },
    { label: t("settings.animFadeInUp") || "Fade In Up", value: "fadeInUp" },
    { label: t("settings.animFadeInDown") || "Fade In Down", value: "fadeInDown" },
    { label: t("settings.animFadeInLeft") || "Fade In Left", value: "fadeInLeft" },
    { label: t("settings.animFadeInRight") || "Fade In Right", value: "fadeInRight" },
    { label: t("settings.animPulse") || "Pulse", value: "pulse" },
  ];

  return (
    <div className="p-4">
      <Form layout="vertical">
        <Form.Item label={t("settings.flowName") || "Flow Name"} help={t("settings.helpFlowName") || "A descriptive name to identify this flow in your admin panel."}>
          <Input
            value={s.name || ""}
            onChange={(e) => set("name", e.target.value)}
            placeholder={t("settings.flowNamePlaceholder") || "My Flow"}
          />
        </Form.Item>

        <Form.Item label={t("settings.flowKey") || "Flow Key"}>
          <Space.Compact style={{ width: "100%" }}>
            <Input value={s.flowKey || ""} readOnly />
            <Tooltip title={t("settings.copyFlowKey") || "Copy flow key"}>
              <Button icon={<CopyOutlined />} onClick={handleCopyFlowKey} />
            </Tooltip>
          </Space.Compact>
        </Form.Item>

        <Form.Item label={t("settings.template") || "Template"} help={t("settings.helpTemplate") || "Choose a visual style for your flow."}>
          <Select
            value={s.templateType || "default"}
            onChange={(v) => set("templateType", v)}
            options={TEMPLATES}
          />
        </Form.Item>

        <div style={{ background: "#f6f8ff", border: "1px solid #d6e0ff", borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <Text strong style={{ fontSize: 14, display: "block", marginBottom: 12 }}>&#x1f3a8; {t("settings.layoutSettings") || "Layout & Display"}</Text>

          <Form.Item label={t("settings.layoutMode") || "Flow Layout Mode"} help={t("settings.helpLayoutMode") || "Modal: popup overlay. Horizontal: split view with product image. Inline: embedded in page. Drawer: slide-in from right."}>
            <Select
              value={s.layoutMode || "modal"}
              onChange={(v) => set("layoutMode", v)}
              options={LAYOUT_OPTIONS}
            />
          </Form.Item>

          <Form.Item label={t("settings.buttonMode") || "Button Mode"} help={t("settings.helpButtonMode") || "Append: show Select Lenses next to Add to Cart. Replace: hide Add to Cart, show only Select Lenses."}>
            <Select
              value={s.buttonMode || "append"}
              onChange={(v) => set("buttonMode", v)}
              options={BUTTON_MODE_OPTIONS}
            />
          </Form.Item>

          <Form.Item label={t("settings.buttonText") || "Button Text"} help={t("settings.helpButtonText") || "Customize the text shown on the Select Lenses button."}>
            <Input
              value={s.buttonText || "Select Lenses"}
              onChange={(e) => set("buttonText", e.target.value)}
              placeholder="Select Lenses"
            />
          </Form.Item>

          <Form.Item label={t("settings.displayMode") || "Button Visibility"} help={t("settings.helpDisplayMode") || "Control when the Select Lenses button appears. Collection mode activates on all products in the selected collection."}>
            <Select
              value={s.displayMode || "always"}
              onChange={(v) => set("displayMode", v)}
              options={DISPLAY_MODE_OPTIONS}
            />
          </Form.Item>

          {s.displayMode === "variant" && (
            <Form.Item label={t("settings.variantId") || "Variant ID"} help={t("settings.helpVariantId") || "Show the button only when this variant is selected."}>
              <Input
                value={s.variantId || ""}
                onChange={(e) => set("variantId", e.target.value)}
                placeholder="gid://shopify/ProductVariant/..."
              />
            </Form.Item>
          )}

          {s.displayMode === "tag" && (
            <Form.Item label={t("settings.productTag") || "Product Tag"} help={t("settings.helpProductTag") || "Show the button only on products with this tag."}>
              <Input
                value={s.tag || ""}
                onChange={(e) => set("tag", e.target.value)}
                placeholder="prescription-ready"
              />
            </Form.Item>
          )}

          {s.displayMode === "collection" && (
            <Form.Item label={t("settings.collectionId") || "Collection ID"} help={t("settings.helpCollectionId") || "Show the button on all products in this collection. Batch activate!"}>
              <Input
                value={s.collectionId || ""}
                onChange={(e) => set("collectionId", e.target.value)}
                placeholder="gid://shopify/Collection/..."
              />
            </Form.Item>
          )}
        </div>

        <Form.Item label={t("settings.addToCartBehavior") || "Add To Cart Behavior"} help={t("settings.helpAtcBehavior") || "Determines what happens after a customer clicks the Add to Cart button."}>
          <Select
            value={s.addToCartBehavior || "redirect_cart"}
            onChange={(v) => set("addToCartBehavior", v)}
            options={ADD_TO_CART_OPTIONS}
          />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 14 }}>{t("settings.advancedOptions") || "Advanced Options"}</Text>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Tooltip title={t("settings.helpHideOutOfStockLenses") || "When enabled, lens products that are out of stock will be automatically hidden from the customer in the storefront."}>
            <Text>{t("settings.hideOutOfStockLenses") || "Auto-hide Out-of-Stock Lenses"}</Text>
          </Tooltip>
          <Switch
            checked={!!s.hideOutOfStockLenses}
            onChange={(v) => set("hideOutOfStockLenses", v)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text>{t("settings.ignoreCurrencyFormat") || "Ignore Currency Format"}</Text>
          <Switch
            checked={!!s.ignoreCurrencyFormat}
            onChange={(v) => set("ignoreCurrencyFormat", v)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text>{t("settings.saveCustomerPrescription") || "Save Customer Prescription"}</Text>
          <Switch
            checked={!!s.saveCustomerPrescription}
            onChange={(v) => set("saveCustomerPrescription", v)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text>{t("settings.combineFrameAndLens") || "Combine Frame & Lens"}</Text>
          <Switch
            checked={!!s.combineFrameAndLens}
            onChange={(v) => set("combineFrameAndLens", v)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Tooltip title={t("settings.helpBundleProduct") || "When enabled, the frame and lens are bundled into a single product in the cart instead of separate line items."}>
            <Text>{t("settings.useBundleProduct") || "Use Bundle Product"}</Text>
          </Tooltip>
          <Switch
            checked={!!s.useBundleProduct}
            onChange={(v) => set("useBundleProduct", v)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text>{t("settings.showOrderNotes") || "Show Order Notes"}</Text>
          <Switch
            checked={!!s.showOrderNotes}
            onChange={(v) => set("showOrderNotes", v)}
          />
        </div>

        <Form.Item label={t("settings.animationType") || "Animation Type"} help={t("settings.helpAnimation") || "The transition animation used when moving between steps in the flow."}>
          <Select
            value={s.animationType || "none"}
            onChange={(v) => set("animationType", v)}
            options={ANIMATIONS}
            showSearch
          />
        </Form.Item>
      </Form>

      <Alert
        type="info"
        showIcon
        message={t("settings.upgradeTitle") || "Upgrade to Pro"}
        description={t("settings.upgradeDesc") || "Unlock advanced animations, custom CSS, A/B testing, and priority support."}
        action={
          <Button size="small" type="primary" icon={<CrownOutlined />}>
            {t("settings.upgradeBtn") || "Upgrade to Pro"}
          </Button>
        }
        style={{ marginTop: 16 }}
      />
    </div>
  );
}
