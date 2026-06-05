import React, { useState, useEffect, useCallback } from "react";
import { Collapse, Input, Button, Space, Typography, Select, Alert, Tag } from "antd";
import { TranslationOutlined, LinkOutlined, PlusOutlined, DeleteOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";
import { useShopify } from "../hooks/useShopify";
import ProductInfoCard from "./ProductInfoCard";
import ProductSelector from "./ProductSelector";
import DisplayConditionBuilder from "./DisplayConditionBuilder";

const { Text, Title } = Typography;

const emptyCondition = () => ({ field: "prescriptionType", operator: "eq", value: "" });

export default function LensOptionDetailEditor({
  option,
  onChange,
  nodeRefs,
  currentFlowId,
}) {
  const { t } = useI18n();
  const { authenticatedFetch } = useShopify();
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const [productDetail, setProductDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [flowUsage, setFlowUsage] = useState([]);
  const [usageLoading, setUsageLoading] = useState(false);

  const badgeText = option.badge?.text || "";
  const customTitle = option.title || "";
  const description = option.description || "";
  const productId = option.productId || "";
  const productTitle = option.productTitle || productDetail?.title || "";
  const productTags = option.productTags || productDetail?.tags || [];
  const productPrices = option.productPrices || productDetail?.prices || [];
  const productImage = option.productImage || productDetail?.image || null;
  const productType = option.productType || productDetail?.productType || "";
  const vendor = option.vendor || productDetail?.vendor || "";
  const variantId = option.variantId || "";
  const variantTitle = option.variantTitle || ((productDetail?.variants || []).find(v => v.id === option.variantId))?.title || "";
  const variantPrice = option.variantPrice ?? 0;
  const variantCompareAtPrice = option.variantCompareAtPrice ?? ((productDetail?.variants || []).find(v => v.id === option.variantId))?.compareAtPrice ?? 0;
  const variantSku = option.variantSku || ((productDetail?.variants || []).find(v => v.id === option.variantId))?.sku || "";
  const displayConditions = option.displayCondition || [];

  useEffect(() => {
    if (productId && (!option.productTags || option.productTags.length === 0 || !option.productType)) {
      setDetailLoading(true);
      authenticatedFetch("/api/admin/products/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [productId] }),
      })
        .then(r => r.json())
        .then(json => {
          const detail = (json.body || [])[0] || null;
          if (detail) {
            setProductDetail(detail);
          }
        })
        .catch(() => {})
        .finally(() => setDetailLoading(false));
    }
  }, [productId]);

  // Fetch flow usage for this product
  useEffect(() => {
    if (!productId) { setFlowUsage([]); return; }
    setUsageLoading(true);
    authenticatedFetch("/api/admin/product-usage/" + encodeURIComponent(productId))
      .then(r => r.json())
      .then(json => {
        setFlowUsage((json && json.body) || []);
      })
      .catch(() => { setFlowUsage([]); })
      .finally(() => setUsageLoading(false));
  }, [productId, authenticatedFetch]);

  const emit = (partial) => {
    if (onChange) onChange({ ...option, ...partial });
  };

  const handleBadgeChange = (text) => {
    emit({ badge: { ...option.badge, text, style: option.badge?.style || "default" } });
  };

  const handleTitleChange = (title) => {
    emit({ title });
  };

  const handleDescriptionChange = (description) => {
    emit({ description });
  };

  const handleProductSelect = (product) => {
    if (product) {
      const selectedVariant = productDetail?.variants?.find(v => v.id === product.variantId)
        || product.variants?.find(v => v.id === product.variantId);
      emit({
        productId: product.productId,
        productTitle: product.productTitle,
        productImage: product.productImage,
        productTags: product.productTags,
        productPrices: product.prices || [],
        productType: product.productType || productDetail?.productType || "",
        vendor: product.vendor || productDetail?.vendor || "",
        variantId: product.variantId,
        variantTitle: product.variantTitle,
        variantPrice: product.variantPrice,
        variantCompareAtPrice: selectedVariant?.compareAtPrice || product.variantCompareAtPrice || 0,
        variantSku: selectedVariant?.sku || product.variantSku || "",
      });
      setProductDetail({
        title: product.productTitle,
        image: product.productImage,
        tags: product.productTags,
        prices: product.prices || [],
        productType: product.productType || productDetail?.productType || "",
        vendor: product.vendor || productDetail?.vendor || "",
        variants: product.variants || [],
      });
    } else {
      emit({
        productId: undefined,
        productTitle: undefined,
        productImage: undefined,
        productTags: undefined,
        productPrices: undefined,
        productType: undefined,
        vendor: undefined,
        variantId: undefined,
        variantTitle: undefined,
        variantPrice: undefined,
        variantCompareAtPrice: undefined,
        variantSku: undefined,
      });
      setProductDetail(null);
    }
  };

  const handleEditProduct = () => {
    const pid = productId || option.productId;
    if (pid) {
      const gid = pid.replace("gid://shopify/Product/", "");
      window.open(`https://admin.shopify.com/store/products/${gid}`, "_blank");
    }
  };

  const handleChangeProduct = () => {
    setProductSelectorOpen(true);
  };

  const handleAddCondition = () => {
    emit({ displayCondition: [...displayConditions, emptyCondition()] });
  };

  const handleConditionChange = (index, condition) => {
    const next = [...displayConditions];
    next[index] = condition;
    emit({ displayCondition: next });
  };

  const handleRemoveCondition = (index) => {
    const next = displayConditions.filter((_, i) => i !== index);
    emit({ displayCondition: next.length > 0 ? next : undefined });
  };

  // 与后端 /api/admin/products/batch 返回结构对齐(availableForSale / inventoryQuantity / inventoryPolicy / tracksInventory)。
  // 判断规则:与 Shopify storefront 的"是否可售"完全一致,避免误报。
  // 1) 产品级别没启用库存追踪(tracksInventory=false) -> 视为有货(常规非实物或外部库存)
  // 2) variant.availableForSale=true -> 有货
  // 3) variant 设置允许超卖(inventoryPolicy=continue) -> 有货
  // 4) inventoryQuantity 为 null/undefined(未追踪) -> 有货
  // 5) inventoryQuantity > 0 -> 有货
  // 全部不满足才判定真无货
  const variantsForInventory = productDetail?.variants;
  const productTracksInventory = productDetail?.tracksInventory !== false;
  const hasInventory = !productTracksInventory
    || !variantsForInventory
    || variantsForInventory.length === 0
    || variantsForInventory.some((v) => {
        if (v.availableForSale === true) return true;
        if (typeof v.inventoryAvailable === "boolean") return v.inventoryAvailable;
        const policy = v.inventoryPolicy || "deny";
        if (policy === "continue") return true;
        const qty = typeof v.inventoryQuantity === "number" ? v.inventoryQuantity : null;
        if (qty === null) return true;
        return qty > 0;
      });

  return (
    <div style={{ padding: "4px 0" }}>
      <Collapse
        size="small"
        bordered={false}
        style={{ background: "transparent" }}
        items={[
          {
            key: "badge",
            label: <Text strong style={{ fontSize: 13 }}>{t("lensOptionDetail.badge") || "Badge"}</Text>,
            children: (
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  {t("lensOptionDetail.badgeHelp") || "Display a badge on this option (e.g. 'Best Value', 'Popular')."}
                </Text>
                <Space>
                  <Input
                    size="small"
                    style={{ width: 200 }}
                    value={badgeText}
                    onChange={(e) => handleBadgeChange(e.target.value)}
                    placeholder={t("lensOptionDetail.badgeTextPlaceholder") || "e.g. Best Value"}
                  />
                  <Select
                    size="small"
                    style={{ width: 100 }}
                    value={option.badge?.style || "default"}
                    onChange={(v) => emit({ badge: { ...option.badge, text: badgeText, style: v } })}
                    options={[
                      { label: t("lensOption.badgeStyleDefault") || "Default", value: "default" },
                      { label: t("lensOption.badgeStyleSuccess") || "Success", value: "success" },
                      { label: t("lensOption.badgeStyleWarning") || "Warning", value: "warning" },
                      { label: t("lensOption.badgeStyleInfo") || "Info", value: "info" },
                      { label: t("lensOption.badgeStyleDanger") || "Danger", value: "danger" },
                    ]}
                  />
                </Space>
              </div>
            ),
          },
          {
            key: "title",
            label: <Text strong style={{ fontSize: 13 }}>{t("lensOptionDetail.title") || "Title"}</Text>,
            children: (
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  {t("lensOptionDetail.titleHelp") || "Custom title. Leave blank to use the bound product title."}
                </Text>
                <Input
                  size="small"
                  value={customTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder={t("lensOptionDetail.titlePlaceholder") || "Custom title or leave blank"}
                />
              </div>
            ),
          },
          {
            key: "description",
            label: (
              <Space>
                <Text strong style={{ fontSize: 13 }}>{t("lensOptionDetail.description") || "Description"}</Text>
                <QuestionCircleOutlined style={{ color: "#1677ff" }} />
              </Space>
            ),
            children: (
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  {t("lensOptionDetail.descriptionHelp") || "Description shown in modal (HTML supported). If filled, a question mark icon appears."}
                </Text>
                <Input.TextArea
                  rows={3}
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder={t("lensOptionDetail.descriptionPlaceholder") || "HTML description content"}
                />
              </div>
            ),
          },
          {
            key: "productBinding",
            label: (
              <Space>
                <Text strong style={{ fontSize: 13 }}>{t("lensOptionDetail.productBinding") || "Product Binding"}</Text>
                {productId && <Text type="success" style={{ fontSize: 11 }}>✓</Text>}
              </Space>
            ),
            children: (
              <div>
                <ProductInfoCard
                  productId={productId}
                  productTitle={productTitle}
                  productTags={productTags}
                  productPrices={productPrices}
                  productImage={productImage}
                  productType={productType}
                  vendor={vendor}
                  variantId={variantId}
                  variantTitle={variantTitle}
                  variantPrice={variantPrice}
                  variantCompareAtPrice={variantCompareAtPrice}
                  variantSku={variantSku}
                  hasInventory={hasInventory}
                  onEditProduct={handleEditProduct}
                  onChangeProduct={handleChangeProduct}
                />
              </div>
            ),
          },
          {
            key: "displayCondition",
            label: <Text strong style={{ fontSize: 13 }}>{t("lensOptionDetail.displayCondition") || "Display Conditions"}</Text>,
            children: (
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                  {t("lensOptionDetail.displayConditionHelp") || "Show this option only when certain prescription conditions are met."}
                </Text>

                {displayConditions.length === 0 && (
                  <div style={{ textAlign: "center", padding: "12px 0", color: "#bbb", fontSize: 12 }}>
                    No conditions defined. The option will always be displayed.
                  </div>
                )}

                {displayConditions.map((cond, idx) => (
                  <div key={idx} style={{ marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <DisplayConditionBuilder
                        condition={cond}
                        onChange={(c) => handleConditionChange(idx, c)}
                        siblingConditions={displayConditions}
                        currentIndex={idx}
                      />
                    </div>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveCondition(idx)}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                ))}

                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleAddCondition}
                  block
                >
                  Add Condition
                </Button>
              </div>
            ),
          },
          {
            key: "flowUsage",
            label: (
              <Space>
                <Text strong style={{ fontSize: 13 }}>{t("lensOptionDetail.flowUsage") || "Used in Flows"}</Text>
                {flowUsage.length > 0 && <Tag color="blue" style={{ fontSize: 10 }}>{flowUsage.length}</Tag>}
              </Space>
            ),
            children: (
              <div>
                {usageLoading && <Text type="secondary" style={{ fontSize: 12 }}>Loading...</Text>}
                {!usageLoading && flowUsage.length === 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t("lensOptionDetail.noFlowUsage") || "This product is not used in any flow yet."}
                  </Text>
                )}
                {!usageLoading && flowUsage.length > 0 && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                      {t("lensOptionDetail.flowUsageHint") || "This lens product is referenced by the following flows:"}
                    </Text>
                    {flowUsage.map((u, i) => (
                      <div key={i} style={{
                        padding: "6px 10px", marginBottom: 4, background: "#f6ffed",
                        border: "1px solid #d9f7be", borderRadius: 4, fontSize: 12,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <Space size="small">
                          <Text strong style={{ fontSize: 12 }}>{u.flowName}</Text>
                          <Tag color="purple" style={{ fontSize: 10 }}>{u.flowType}</Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {u.lensPageName} / {u.optionRef}
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "tutorials",
            label: <Text strong style={{ fontSize: 13 }}>{t("lensOptionDetail.tutorialLinks") || "Tutorials"}</Text>,
            children: (
              <div>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                  <LinkOutlined style={{ marginRight: 6 }} />
                  {t("lensOptionDetail.tutorialDescription") || "How to add a description to an option?"}
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
                  <LinkOutlined style={{ marginRight: 6 }} />
                  {t("lensOptionDetail.tutorialImage") || "How to add an image to an option?"}
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ display: "block", fontSize: 13 }}>
                  <LinkOutlined style={{ marginRight: 6 }} />
                  {t("lensOptionDetail.tutorialTemplate") || "How to modify the template styles?"}
                </a>
              </div>
            ),
          },
        ]}
      />

      <ProductSelector
        open={productSelectorOpen}
        onClose={() => setProductSelectorOpen(false)}
        onSelect={handleProductSelect}
        currentProductId={productId}
        currentVariantId={variantId}
      />
    </div>
  );
}
