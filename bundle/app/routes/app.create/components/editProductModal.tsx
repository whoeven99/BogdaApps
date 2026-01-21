import { X } from "lucide-react";
import { ProductVariantsDataType } from "../route";
import { useFetcher } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Divider, Flex, Input, Popover, Radio } from "antd";
import { EllipsisOutlined, SearchOutlined } from "@ant-design/icons";
import { Pagination } from "@shopify/polaris";

interface productModalItemType {
    productId: string;
    productTitle: string;
    productImage: string;
    variants: ProductVariantsDataType[];
}

interface ProductModalProps {
    mainModalType: "ProductVariants" | "EditProductVariants" | null;
    setMainModalType: (modalType: "ProductVariants" | "EditProductVariants" | null) => void;
    selectedProducts: ProductVariantsDataType[];
    setSelectedProducts: (products: ProductVariantsDataType[]) => void;
}

const EditProductModal: React.FC<ProductModalProps> = ({
    mainModalType,
    setMainModalType,
    selectedProducts,
    setSelectedProducts,
}) => {
    const { t } = useTranslation();

    const productModalData = useMemo(() => selectedProducts, [selectedProducts, mainModalType]);

    const [searchQuery, setSearchQuery] = useState<string>("");

    // const [loadMoreLoading, setLoadMoreLoading] = useState<boolean>(false);
    const listRef = useRef<HTMLDivElement | null>(null);

    const filteredVariants = useMemo(() => {
        if (!searchQuery.trim()) return productModalData;

        const keyword = searchQuery.toLowerCase();

        return productModalData.filter((variant) =>
            variant.name?.toLowerCase().includes(keyword)
        );
    }, [searchQuery, productModalData]);

    const onPrevious = () => {

    }

    const onNext = () => {

    }

    const onClose = () => {
        setMainModalType(null);
        setSearchQuery("");
    };

    console.log("productModalData:", productModalData);


    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.5)",
                display: mainModalType === "EditProductVariants" ? "flex" : "none",
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
                <Input
                    prefix={<SearchOutlined />}
                    placeholder={t("Search products...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        marginBottom: "20px",
                    }}
                />

                <div
                    ref={listRef}
                    style={{
                        display: "grid",
                        gap: "12px",
                        overflowY: "auto",
                        flex: 1,
                        marginBottom: "12px",
                    }}
                >
                    {productModalData.map((variant) => (
                        <Flex
                            key={variant.id}
                            justify="space-between"
                            align="center"
                            gap={8}
                            style={{
                                width: "100%",
                                padding: "12px",
                                border: "1px solid #dfe3e8",
                                borderRadius: "8px",
                                cursor: "pointer",
                            }}
                            onClick={() => {
                                if (!selectedProducts.some((p) => p.id === variant.id)) {
                                    setSelectedProducts([...selectedProducts, variant]);
                                } else {
                                    setSelectedProducts(selectedProducts.filter((p) => p.id !== variant.id));
                                }
                            }}
                        >
                            <img
                                src={variant.image}
                                alt={variant.name}
                                style={{
                                    width: "60px",
                                    height: "60px",
                                    borderRadius: "6px",
                                }}
                            />
                            <Flex
                                justify="space-between"
                                align="end"
                                vertical
                                style={{
                                    width: "100%",
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 500,
                                        width: "100%"
                                    }}
                                >
                                    {variant.name}
                                </div>
                                <Flex
                                    justify="space-between"
                                    align="center"
                                    style={{
                                        width: "100%",
                                    }}
                                >
                                    <div style={{ color: "#6d7175", fontSize: "14px" }}>
                                        {variant.price}
                                    </div>
                                    <Checkbox
                                        checked={selectedProducts.some((p) => p.id === variant.id)}
                                    />
                                </Flex>
                            </Flex>
                        </Flex>
                    ))}
                </div>

                {/* <Flex
                    justify="center"
                    align="center"
                > */}
                {/* <Pagination
                        hasPrevious={productModalData.pageInfo.hasPreviousPage}
                        onPrevious={onPrevious}
                        hasNext={productModalData.pageInfo.hasNextPage}
                        onNext={onNext}
                    /> */}
                {/* </Flex> */}
            </div>
        </div >
    );
};

export default EditProductModal;
