import { Button } from "antd";
import { X } from "lucide-react";

type SelectedProduct = {
  id: string;
  title: string;
  image: string;
  price: string;
  variantsCount: number;
};

type Props = {
  selectedProductsData: SelectedProduct[];
  onSelectProducts: () => void | Promise<void>;
  onRemoveProduct: (productId: string) => void;
};

export default function ScopeEditor({
  selectedProductsData,
  onSelectProducts,
  onRemoveProduct,
}: Props) {
  return (
    <div className="mb-8">
      <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
        Scope: Products in this campaign
      </h3>

      {selectedProductsData.length === 0 ? (
        <Button
          size="large"
          className="text-[#008060] border-[#008060] hover:text-[#006e52] hover:border-[#006e52] hover:bg-[#f0f9f6]"
          onClick={(e) => {
            void onSelectProducts();
            e.preventDefault();
          }}
        >
          Add products eligible for offer
        </Button>
      ) : (
        <div>
          <div className="create-offer-selected-grid">
            {selectedProductsData.slice(0, 3).map((product) => (
              <div
                key={product.id}
                className="create-offer-selected-card"
              >
                <button
                  type="button"
                  className="create-offer-selected-remove"
                  onClick={(e) => {
                    onRemoveProduct(product.id);
                    e.preventDefault();
                  }}
                  aria-label={`Remove ${product.title}`}
                >
                  <X size={14} />
                </button>
                <img
                  src={product.image}
                  alt={product.title}
                  className="create-offer-selected-image"
                />
                <div className="create-offer-selected-name">
                  {product.title}
                </div>
                <div className="create-offer-selected-price">
                  {product.price}
                </div>
              </div>
            ))}
          </div>
          <div className="create-offer-selected-count">
            {selectedProductsData.length} product
            {selectedProductsData.length > 1 ? "s" : ""} selected
            {(() => {
              const totalVariants = selectedProductsData.reduce(
                (sum, product) => sum + (product.variantsCount || 1),
                0,
              );
              return totalVariants > 0
                ? ` (${totalVariants} variant${totalVariants > 1 ? "s" : ""})`
                : "";
            })()}
          </div>
          <Button
            type="link"
            onClick={(e) => {
              void onSelectProducts();
              e.preventDefault();
            }}
            className="px-0"
          >
            Edit products
          </Button>
        </div>
      )}
    </div>
  );
}
