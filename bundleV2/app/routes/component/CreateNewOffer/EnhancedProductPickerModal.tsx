import { Button, Checkbox, Input, Modal, Select } from "antd";
import { useEffect, useMemo, useState } from "react";

export type EnhancedPickerCollection = {
  id: string;
  title: string;
};

export type EnhancedPickerProduct = {
  id: string;
  name: string;
  handle?: string;
  image: string;
  price: string;
  variantsCount: number;
  hasSubscription: boolean;
  collections?: EnhancedPickerCollection[];
  variants?: Array<{
    id: string;
    title: string;
    price?: string;
    selectedOptions?: Array<{ name: string; value: string }>;
  }>;
};

type Props = {
  open: boolean;
  title: string;
  products: EnhancedPickerProduct[];
  selectedProductIds: string[];
  multiple?: boolean;
  onCancel: () => void;
  onConfirm: (productIds: string[]) => void;
};

export default function EnhancedProductPickerModal({
  open,
  title,
  products,
  selectedProductIds,
  multiple = true,
  onCancel,
  onConfirm,
}: Props) {
  const [query, setQuery] = useState("");
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [draftSelectionIds, setDraftSelectionIds] = useState<string[]>(selectedProductIds);
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCollectionIds([]);
    setDraftSelectionIds(selectedProductIds);
    setExpandedProductIds([]);
  }, [open, selectedProductIds]);

  const collectionOptions = useMemo(
    () =>
      Array.from(
        new Map(
          products.flatMap((product) =>
            (product.collections || []).map((collection) => [
              String(collection.id),
              {
                label: collection.title,
                value: String(collection.id),
              },
            ]),
          ),
        ).values(),
      ).sort((left, right) => left.label.localeCompare(right.label)),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const collectionIdSet = new Set(collectionIds);

    return products.filter((product) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        String(product.handle || "").toLowerCase().includes(normalizedQuery);

      const matchesCollections =
        collectionIdSet.size === 0 ||
        (product.collections || []).some((collection) =>
          collectionIdSet.has(String(collection.id)),
        );

      return matchesQuery && matchesCollections;
    });
  }, [collectionIds, products, query]);

  const filteredIds = useMemo(
    () => filteredProducts.map((product) => String(product.id)),
    [filteredProducts],
  );
  const selectedIdSet = useMemo(() => new Set(draftSelectionIds), [draftSelectionIds]);
  const visibleSelectedCount = filteredIds.filter((id) => selectedIdSet.has(id)).length;

  const updateSelectionForProduct = (productId: string, checked: boolean) => {
    if (!multiple) {
      setDraftSelectionIds(checked ? [productId] : []);
      return;
    }

    setDraftSelectionIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(productId);
      else next.delete(productId);
      return Array.from(next);
    });
  };

  const selectAllVisible = () => {
    if (!multiple || filteredIds.length === 0) return;
    setDraftSelectionIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const invertVisible = () => {
    if (!multiple || filteredIds.length === 0) return;
    const visibleIdSet = new Set(filteredIds);
    setDraftSelectionIds((prev) => {
      const next = new Set(prev);
      for (const id of visibleIdSet) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return Array.from(next);
    });
  };

  const clearVisible = () => {
    if (!multiple || filteredIds.length === 0) return;
    const visibleIdSet = new Set(filteredIds);
    setDraftSelectionIds((prev) => prev.filter((id) => !visibleIdSet.has(id)));
  };
  const toggleExpandedProduct = (productId: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return Array.from(next);
    });
  };

  const modalTitle = `${title} (${draftSelectionIds.length} selected)`;

  return (
    <Modal
      open={open}
      title={modalTitle}
      width={920}
      onCancel={onCancel}
      onOk={() => onConfirm(draftSelectionIds)}
      okText={multiple ? "Add selected products" : "Use selected product"}
      cancelText="Cancel"
      destroyOnHidden
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Search products
            <Input
              size="large"
              className="mt-1"
              value={query}
              placeholder="Search by product title or handle"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Collections
            <Select
              mode="multiple"
              size="large"
              className="mt-1 w-full"
              value={collectionIds}
              options={collectionOptions}
              placeholder="Filter by collection"
              allowClear
              onChange={(values) => setCollectionIds(values)}
            />
          </label>
        </div>

        <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
          {filteredProducts.length} matched
          {collectionIds.length > 0 ? ` • ${collectionIds.length} collection filters` : ""}
          {query.trim() ? ` • keyword: "${query.trim()}"` : ""}
          {multiple ? ` • ${visibleSelectedCount} selected in current results` : ""}
          {" • click a product to view variants"}
        </div>

        {multiple ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={selectAllVisible} disabled={filteredProducts.length === 0}>
              Select current results
            </Button>
            <Button onClick={invertVisible} disabled={filteredProducts.length === 0}>
              Invert current results
            </Button>
            <Button onClick={clearVisible} disabled={visibleSelectedCount === 0}>
              Clear current results
            </Button>
            <Button danger disabled={draftSelectionIds.length === 0} onClick={() => setDraftSelectionIds([])}>
              Clear all
            </Button>
          </div>
        ) : null}

        {filteredProducts.length === 0 ? (
          <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-4 text-[13px] text-[#5c6166]">
            No products match the current conditions. Try another keyword or collection.
          </div>
        ) : (
          <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
            {filteredProducts.map((product) => {
              const productId = String(product.id);
              const checked = selectedIdSet.has(productId);
              const variants = Array.isArray(product.variants) ? product.variants : [];
              const isExpanded = expandedProductIds.includes(productId);
              return (
                <div
                  key={productId}
                  className={`rounded-[10px] border px-3 py-3 transition ${
                    checked
                      ? "border-[#b7e1d3] bg-[#f5fff9]"
                      : "border-[#e3e8ed] bg-white hover:border-[#c9ccd0]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={checked}
                      onChange={(e) => updateSelectionForProduct(productId, e.target.checked)}
                    />
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      onClick={() => toggleExpandedProduct(productId)}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-medium text-[#1c1f23]">
                              {product.name}
                            </div>
                            <div className="mt-1 text-[12px] text-[#5c6166]">
                              {product.price} • {product.variantsCount} variant
                              {product.variantsCount > 1 ? "s" : ""}
                              {product.hasSubscription ? " • Subscription" : ""}
                            </div>
                          </div>
                          <span className="shrink-0 text-[12px] text-[#5c6166]">
                            {isExpanded ? "Hide variants" : "Show variants"}
                          </span>
                        </div>
                        {(product.collections || []).length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(product.collections || []).slice(0, 4).map((collection) => (
                              <span
                                key={`${productId}-${collection.id}`}
                                className="rounded-full bg-[#f4f6f8] px-2 py-0.5 text-[11px] text-[#5c6166]"
                              >
                                {collection.title}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  </div>
                  {isExpanded ? (
                    <div className="mt-3 border-t border-[#eef1f3] pt-3">
                      {variants.length > 0 ? (
                        <div className="space-y-2">
                          {variants.map((variant) => (
                            <div
                              key={variant.id}
                              className="rounded-[8px] bg-[#f6f8f9] px-3 py-2"
                            >
                              <div className="text-[12px] font-medium text-[#1c1f23]">
                                {variant.title || "Default variant"}
                              </div>
                              <div className="mt-1 text-[12px] text-[#5c6166]">
                                {variant.price ? `$${variant.price}` : product.price}
                                {Array.isArray(variant.selectedOptions) &&
                                variant.selectedOptions.length > 0
                                  ? ` • ${variant.selectedOptions
                                      .map((option) => `${option.name}: ${option.value}`)
                                      .join(" • ")}`
                                  : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[12px] text-[#5c6166]">
                          No variant details are available for this product.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
