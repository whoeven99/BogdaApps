import React, { useState, useRef } from "react";
import { Input, Tag, Button, Space, Typography, Spin, Tooltip } from "antd";
import { PlusOutlined, CloseOutlined, SearchOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";
import { useShopify } from "../hooks/useShopify";

const { Text } = Typography;

export default function ProductAssignment({ productIds, onChange }) {
  const { t } = useI18n();
  const { authenticatedFetch } = useShopify();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);
  const [assignedProducts, setAssignedProducts] = useState([]);

  const assignedSet = new Set(productIds || []);

  const doSearch = (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    authenticatedFetch("/api/admin/products/search?q=" + encodeURIComponent(q.trim()))
      .then((r) => r.json())
      .then((json) => {
        const list = json.body || [];
        setResults(list.map((p) => ({ id: p.id, title: p.title, image: p.image })));
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  };

  const onInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(v), 300);
  };

  const handleAdd = (productId, title) => {
    const next = [...(productIds || []), productId];
    if (onChange) onChange(next);
    setResults([]);
    setQuery("");
  };

  const handleRemove = (productId) => {
    const next = (productIds || []).filter((id) => id !== productId);
    if (onChange) onChange(next);
  };

  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#555" }}>
        {t("productAssignment.title") || "Assigned Products"}
      </div>

      <Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 12 }}>
        {t("productAssignment.hint") || "This flow will appear on the storefront for the assigned products. Products not listed here will not show the prescription modal."}
      </Text>

      {productIds && productIds.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {productIds.map((pid) => (
            <Tag
              key={pid}
              closable
              onClose={() => handleRemove(pid)}
              style={{ marginBottom: 4, fontSize: 12, padding: "2px 8px" }}
            >
              {pid}
            </Tag>
          ))}
        </div>
      )}

      {productIds && productIds.length === 0 && (
        <div style={{
          padding: "20px", textAlign: "center", border: "1px dashed #ddd",
          borderRadius: 8, background: "#fafafa", marginBottom: 12,
        }}>
          <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
            {t("productAssignment.empty") || "No products assigned. Search below to add products."}
          </Text>
        </div>
      )}

      <Input
        prefix={<SearchOutlined style={{ color: "#bbb" }} />}
        value={query}
        onChange={onInput}
        placeholder={t("productAssignment.searchPlaceholder") || "Search products by title or tag..."}
        size="small"
        style={{ marginBottom: 8 }}
      />

      {searching && (
        <div style={{ textAlign: "center", padding: 12 }}>
          <Spin size="small" />
        </div>
      )}

      {!searching && results.length > 0 && (
        <div style={{
          border: "1px solid #e5e5e5", borderRadius: 6, maxHeight: 220, overflow: "auto",
        }}>
          {results.map((p) => {
            const isAssigned = assignedSet.has(p.id);
            return (
              <div
                key={p.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderBottom: "1px solid #f0f0f0", fontSize: 13,
                  background: isAssigned ? "#f6ffed" : "#fff",
                }}
              >
                <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.image && (
                    <img src={p.image} alt="" style={{
                      width: 24, height: 24, borderRadius: 4, marginRight: 8, objectFit: "cover", verticalAlign: "middle",
                    }} onError={(e) => { e.target.style.display = "none"; }} />
                  )}
                  <span style={{ verticalAlign: "middle" }}>{p.title}</span>
                </div>
                {isAssigned ? (
                  <Tag color="green" style={{ fontSize: 11, marginLeft: 8 }}>已分配</Tag>
                ) : (
                  <Button
                    type="link" size="small" icon={<PlusOutlined />}
                    onClick={() => handleAdd(p.id, p.title)}
                    style={{ fontSize: 12, height: 24 }}
                  >
                    {t("productAssignment.assign") || "Assign"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
