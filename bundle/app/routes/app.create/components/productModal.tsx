import { X } from "lucide-react";
import { ProductVariantsDataType } from "../route";
import { useFetcher } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface productModalDataType {
    data: ProductVariantsDataType[];
    pageInfo: {
        endCursor: string;
        hasNextPage: boolean
    }
}

interface ProductModalProps {
    mainModalType: "ProductVariants" | "CustomerSegments" | "Customer" | null;
    setMainModalType: (modalType: "ProductVariants" | "CustomerSegments" | "Customer" | null) => void;
    selectedProducts: ProductVariantsDataType[];
    setSelectedProducts: (products: ProductVariantsDataType[]) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({
    mainModalType,
    setMainModalType,
    selectedProducts,
    setSelectedProducts,
}) => {
    const { t } = useTranslation();
    const productModalDataFetcher = useFetcher<any>();

    const [productModalData, setProductModalData] = useState<productModalDataType>({
        data: [],
        pageInfo: {
            endCursor: "",
            hasNextPage: false
        }
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    const [searchLoading, setSearchLoading] = useState(false);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);

    const listRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (productModalDataFetcher.data) {
            if (productModalDataFetcher.data.success) {
                const productVariantsData = productModalDataFetcher.data.response?.productVariants?.nodes;
                const pageInfo = productModalDataFetcher.data.response?.productVariants?.pageInfo;
                if (productVariantsData?.length) {
                    const data: ProductVariantsDataType[] = productVariantsData.map((variant: any) => {
                        return {
                            id: variant.id,
                            name: `${variant.product?.title} - ${variant.title}`,
                            price: variant.price,
                            image: variant.media?.edges[0]?.node?.preview?.image?.url,
                        }
                    })
                    if (loadMoreLoading) {
                        setProductModalData({ data: [...productModalData.data, ...data], pageInfo });
                        setLoadMoreLoading(false);
                    } else {
                        setProductModalData({ data, pageInfo });
                        setSearchLoading(false);
                    }
                }
            }
        }
    }, [productModalDataFetcher.data])

    useEffect(() => {
        if (mainModalType !== "ProductVariants") return;

        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            console.log("🔍 trigger search:", searchQuery);
            setSearchLoading(true);
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery, mainModalType]);

    useEffect(() => {
        if (searchLoading) {
            productModalDataFetcher.submit({
                productVariantRequestBody: JSON.stringify({
                    query: debouncedQuery,
                })
            }, {
                method: "POST",
            });
        }
        if (loadMoreLoading) {
            productModalDataFetcher.submit({
                productVariantRequestBody: JSON.stringify({
                    query: debouncedQuery,
                    endCursor: productModalData.pageInfo.endCursor,
                })
            }, {
                method: "POST",
            });
        }
    }, [searchLoading, loadMoreLoading])

    const handleScroll = () => {
        const el = listRef.current;
        if (mainModalType !== "ProductVariants" || !el || productModalDataFetcher.state === "submitting" || productModalData.pageInfo.hasNextPage === false) return;

        const { scrollTop, scrollHeight, clientHeight } = el;

        if (scrollTop + clientHeight >= scrollHeight - 50) {
            // 触发加载更多（先不写）
            console.log("⬇️ load more");
            setLoadMoreLoading(true);
        }
    };

    const onClose = () => {
        setMainModalType(null);
        setSearchQuery("");
        setDebouncedQuery("");
        setSearchLoading(false);
        setLoadMoreLoading(false);
        setProductModalData({
            data: [],
            pageInfo: {
                endCursor: "",
                hasNextPage: false
            }
        });
    };


    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                display: mainModalType === "ProductVariants" ? "flex" : "none",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
        >
            <div
                style={{
                    background: "#fff",
                    borderRadius: "12px",
                    width: "90%",
                    maxWidth: "800px",
                    maxHeight: "90vh",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "20px",
                    }}
                >
                    <h2 style={{ fontSize: "18px", fontWeight: 600 }}>
                        {t("Select Products")}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Search */}
                <input
                    type="text"
                    placeholder={t("Search products...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #dfe3e8",
                        borderRadius: "6px",
                        marginBottom: "12px",
                        fontSize: "14px",
                    }}
                />

                {searchLoading && (
                    <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
                        {t("Searching...")}
                    </div>
                )}

                <div
                    ref={listRef}
                    onScroll={handleScroll}
                    style={{
                        display: "grid",
                        gap: "12px",
                        overflowY: "auto",
                        flex: 1,
                    }}
                >
                    {productModalData.data.map((product) => (
                        <div
                            key={product.id}
                            style={{
                                display: "flex",
                                gap: "12px",
                                padding: "12px",
                                border: "1px solid #dfe3e8",
                                borderRadius: "8px",
                                cursor: "pointer",
                            }}
                            onClick={() => {
                                if (!selectedProducts.find((p) => p.id === product.id)) {
                                    setSelectedProducts([...selectedProducts, product]);
                                } else {
                                    setSelectedProducts(selectedProducts.filter((p) => p.id !== product.id));
                                }
                            }}
                        >
                            <img
                                src={product.image}
                                alt={product.name}
                                style={{
                                    width: "60px",
                                    height: "60px",
                                    borderRadius: "6px",
                                }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>{product.name}</div>
                                <div style={{ color: "#6d7175", fontSize: "14px" }}>
                                    {product.price}
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={selectedProducts.some((p) => p.id === product.id)}
                                readOnly
                                style={{ width: "20px", height: "20px" }}
                            />
                        </div>
                    ))}

                    {loadMoreLoading && (
                        <div style={{ textAlign: "center", fontSize: 12, color: "#999" }}>
                            {t("Loading more...")}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductModal;
