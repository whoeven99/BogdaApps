import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal, Input, Button, Space, List, Spin, Typography, Image, Tag, Radio, Badge, Empty, Select, Divider } from "antd";
import { SearchOutlined, InboxOutlined, FilterOutlined, LoadingOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";
import { useShopify } from "../hooks/useShopify";

const { Text, Title } = Typography;

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];

export default function ProductSelector({ open, onClose, onSelect, currentProductId, currentVariantId }) {
  const { t } = useI18n();
  const { authenticatedFetch } = useShopify();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [expandedProductId, setExpandedProductId] = useState(currentProductId || null);
  const [selectedVariantId, setSelectedVariantId] = useState(currentVariantId || null);
  const [selectedVariantPrice, setSelectedVariantPrice] = useState(0);
  const [selectedVariantTitle, setSelectedVariantTitle] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const [productTypeFilter, setProductTypeFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [filterOptions, setFilterOptions] = useState({ productTypes: [], vendors: [] });
  const [filtersLoading, setFiltersLoading] = useState(false);

  const [pageInfo, setPageInfo] = useState({ hasNextPage: false, endCursor: null });
  const [loadingMore, setLoadingMore] = useState(false);

  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q, filters = {}, cursor = null, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const params = new URLSearchParams();
      params.append("q", q || "");
      params.append("first", "20");
      if (filters.productType) params.append("product_type", filters.productType);
      if (filters.vendor) params.append("vendor", filters.vendor);
      if (filters.status) params.append("status", filters.status);
      if (cursor) params.append("after", cursor);

      const res = await authenticatedFetch(`/api/admin/products/search?${params.toString()}`);
      const json = await res.json().catch(() => ({ status: "error", message: "Invalid JSON response" }));
      if (!res.ok || json.status === "error") {
        const detail = json?.message || `HTTP ${res.status} ${res.statusText}`;
        setError((t("productSelector.searchError") || "Search failed") + ": " + detail);
        if (!append) setProducts([]);
      } else {
        const list = json.body || [];
        if (append) {
          setProducts(prev => [...prev, ...list]);
        } else {
          setProducts(list);
        }
        setPageInfo(json.pageInfo || { hasNextPage: false, endCursor: null });
      }
    } catch (e) {
      setError((t("productSelector.searchError") || "Search failed") + ": " + (e?.message || "network error"));
      if (!append) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [authenticatedFetch, t]);

  const loadFilters = useCallback(async () => {
    setFiltersLoading(true);
    try {
      const res = await authenticatedFetch("/api/admin/products/filters");
      const json = await res.json();
      if (json.status === "success" && json.body) {
        setFilterOptions(json.body);
      }
    } catch (e) {
    } finally {
      setFiltersLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    if (open) {
      setExpandedProductId(currentProductId || null);
      setSelectedVariantId(currentVariantId || null);
      setSelectedVariantPrice(0);
      setSelectedVariantTitle("");
      setSelectedProduct(null);
      setSearchQuery("");
      setError("");
      setProductTypeFilter("");
      setVendorFilter("");
      setStatusFilter("active");
      const filters = {};
      doSearch("", filters);
      loadFilters();
    }
  }, [open, currentProductId, currentVariantId, doSearch, loadFilters]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const filters = {
        productType: productTypeFilter,
        vendor: vendorFilter,
        status: statusFilter,
      };
      doSearch(searchQuery, filters);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, productTypeFilter, vendorFilter, statusFilter, doSearch]);

  const handleProductClick = (product) => {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
    } else {
      setExpandedProductId(product.id);
      setSelectedProduct(product);
    }
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariantId(variant.id);
    setSelectedVariantPrice(variant.price);
    setSelectedVariantTitle(variant.title);
  };

  const handleLoadMore = () => {
    if (pageInfo.hasNextPage && pageInfo.endCursor && !loadingMore) {
      const filters = {
        productType: productTypeFilter,
        vendor: vendorFilter,
        status: statusFilter,
      };
      doSearch(searchQuery, filters, pageInfo.endCursor, true);
    }
  };

  const handleConfirm = () => {
    if (!selectedVariantId || !selectedProduct) {
      onSelect(null);
      onClose();
      return;
    }
    setConfirming(true);
    authenticatedFetch("/api/admin/products/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [selectedProduct.id] }),
    })
      .then(r => r.json())
      .then(json => {
        const detail = (json.body || [])[0] || null;
        if (detail) {
          const selectedVariant = (detail.variants || []).find(v => v.id === selectedVariantId);
          onSelect({
            productId: detail.id,
            productTitle: detail.title,
            productImage: detail.image || selectedProduct.image || null,
            productTags: detail.tags || [],
            productType: detail.productType || "",
            vendor: detail.vendor || "",
            variantId: selectedVariantId,
            variantTitle: selectedVariantTitle,
            variantPrice: selectedVariantPrice,
            variantCompareAtPrice: selectedVariant ? selectedVariant.compareAtPrice : 0,
            variantSku: selectedVariant ? selectedVariant.sku : "",
            variants: detail.variants || [],
            prices: detail.prices || [],
          });
        } else {
          onSelect(null);
        }
      })
      .catch(() => onSelect(null))
      .finally(() => {
        setConfirming(false);
        onClose();
      });
  };

  const hasAnyFilter = productTypeFilter || vendorFilter || statusFilter !== "active";

  return (
    <Modal
      title={t("productSelector.title") || "Select Product & Variant"}
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      okText={t("productSelector.select") || "Confirm Selection"}
      okButtonProps={{ disabled: !selectedVariantId, loading: confirming }}
      confirmLoading={confirming}
      width={760}
      destroyOnClose
      styles={{ body: { padding: "12px 16px" } }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Input
          prefix={<SearchOutlined style={{ color: "#bbb" }} />}
          placeholder={t("productSelector.searchPlaceholder") || "Search products by title..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          style={{ flex: 1 }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
        <FilterOutlined style={{ color: hasAnyFilter ? "#1677ff" : "#bbb", fontSize: 14 }} />
        <Select
          size="small"
          placeholder={t("productSelector.productType") || "Product Type"}
          value={productTypeFilter || undefined}
          onChange={(v) => setProductTypeFilter(v || "")}
          allowClear
          showSearch
          style={{ minWidth: 130 }}
          loading={filtersLoading}
          options={filterOptions.productTypes.map(pt => ({ label: pt, value: pt }))}
        />
        <Select
          size="small"
          placeholder={t("productSelector.vendor") || "Vendor"}
          value={vendorFilter || undefined}
          onChange={(v) => setVendorFilter(v || "")}
          allowClear
          showSearch
          style={{ minWidth: 110 }}
          loading={filtersLoading}
          options={filterOptions.vendors.map(v => ({ label: v, value: v }))}
        />
        <Select
          size="small"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
          style={{ width: 100 }}
          options={STATUS_OPTIONS.map(s => ({ label: s.label, value: s.value }))}
        />
      </div>

      {error && (
        <div style={{ color: "#d82c0d", fontSize: 12, marginBottom: 8, padding: "6px 10px", background: "#fff2f0", borderRadius: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <span>⚠</span> {error}
        </div>
      )}

      {selectedVariantId && (
        <div style={{
          padding: "8px 12px", marginBottom: 12, background: "#e6f4ff", borderRadius: 6,
          border: "1px solid #91caff", fontSize: 13, color: "#005bd3",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>
            <strong>{t("productSelector.selected") || "Selected"}:</strong>{" "}
            {selectedProduct?.title || "—"} – {selectedVariantTitle} – <Text>${selectedVariantPrice.toFixed(2)}</Text>
          </span>
          <Badge status="processing" />
        </div>
      )}

      <Spin spinning={loading}>
        {products.length === 0 && !loading ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#bbb" }}>
            <InboxOutlined style={{ fontSize: 36, marginBottom: 8 }} />
            <div style={{ fontSize: 13 }}>{t("productSelector.noResults") || "No products found"}</div>
          </div>
        ) : (
          <>
            <div style={{ maxHeight: 400, overflow: "auto" }}>
              {products.map((product) => {
                const isExpanded = expandedProductId === product.id;
                const variants = product.variants || [];
                const hasImage = !!product.image;

                return (
                  <div key={product.id} style={{ marginBottom: 8 }}>
                    <div
                      onClick={() => handleProductClick(product)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                        background: isExpanded ? "#f0f5ff" : "#fafafa",
                        border: isExpanded ? "1px solid #1677ff" : "1px solid #eee",
                        transition: "all 0.15s",
                      }}
                    >
                      {hasImage ? (
                        <Image src={product.image} alt={product.title} width={48} height={48} style={{ borderRadius: 6, objectFit: "cover", flexShrink: 0 }} preview={false} />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: 6, background: "#f0f0f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <InboxOutlined style={{ color: "#ccc", fontSize: 20 }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ fontSize: 14, display: "block" }} ellipsis>{product.title}</Text>
                        <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                          {product.productType && (
                            <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: "0 4px", lineHeight: "18px" }}>{product.productType}</Tag>
                          )}
                          {product.vendor && (
                            <Text type="secondary" style={{ fontSize: 11 }}>{product.vendor}</Text>
                          )}
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>{variants.length} variant(s)</Text>
                        </div>
                      </div>
                      {product.status !== "active" && (
                        <Tag color={product.status === "draft" ? "orange" : "red"} style={{ fontSize: 10, flexShrink: 0 }}>{product.status}</Tag>
                      )}
                      <Tag color={isExpanded ? "blue" : "default"} style={{ fontSize: 10, flexShrink: 0 }}>
                        {isExpanded ? "▲" : "▼"}
                      </Tag>
                    </div>

                    {isExpanded && (
                      <div style={{
                        marginTop: 2, marginLeft: 12, marginRight: 4,
                        padding: "8px 12px", background: "#fff", border: "1px solid #e8e8e8",
                        borderTop: "none", borderRadius: "0 0 8px 8px",
                      }}>
                        {variants.length === 0 ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>No variants found.</Text>
                        ) : (
                          <Radio.Group
                            value={selectedVariantId}
                            onChange={(e) => {
                              const v = variants.find(vv => vv.id === e.target.value);
                              if (v) handleVariantSelect(v);
                            }}
                            style={{ width: "100%" }}
                          >
                            {variants.map((v) => {
                              const outOfStock = v.inventoryQuantity <= 0 && v.inventoryPolicy === "deny";
                              return (
                                <div
                                  key={v.id}
                                  style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "6px 8px", marginBottom: 4, borderRadius: 6,
                                    background: selectedVariantId === v.id ? "#e6f4ff" : "transparent",
                                    border: selectedVariantId === v.id ? "1px solid #91caff" : "1px solid transparent",
                                    opacity: outOfStock ? 0.45 : 1,
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                    <Radio
                                      value={v.id}
                                      disabled={outOfStock}
                                      style={{ marginRight: 0 }}
                                    >
                                      <span style={{ fontSize: 13, fontWeight: selectedVariantId === v.id ? 600 : 400 }}>
                                        {v.title}
                                      </span>
                                    </Radio>
                                    {v.sku && (
                                      <Text type="secondary" style={{ fontSize: 11 }}>{v.sku}</Text>
                                    )}
                                  </div>
                                  <Space size={6}>
                                    {v.compareAtPrice > 0 && v.compareAtPrice > v.price && (
                                      <Text delete type="secondary" style={{ fontSize: 12 }}>
                                        ${v.compareAtPrice.toFixed(2)}
                                      </Text>
                                    )}
                                    <Text strong style={{ fontSize: 13, color: "#f5222d" }}>
                                      ${v.price.toFixed(2)}
                                    </Text>
                                    {outOfStock ? (
                                      <Tag color="red" style={{ fontSize: 10, margin: 0 }}>Out of stock</Tag>
                                    ) : v.inventoryQuantity <= 5 && v.inventoryQuantity > 0 ? (
                                      <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>{v.inventoryQuantity} left</Tag>
                                    ) : null}
                                  </Space>
                                </div>
                              );
                            })}
                          </Radio.Group>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {pageInfo.hasNextPage && (
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <Button
                  onClick={handleLoadMore}
                  loading={loadingMore}
                  icon={loadingMore ? <LoadingOutlined /> : null}
                  size="small"
                >
                  {t("productSelector.loadMore") || "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      </Spin>
    </Modal>
  );
}
