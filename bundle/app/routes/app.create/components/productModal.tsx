import { X } from "lucide-react";
import { ProductVariantsDataType } from "../route";
import { useFetcher } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
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

interface productModalDataType {
    data: productModalItemType[]
    pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string;
    }
}

interface ProductModalProps {
    mainModalType: "ProductVariants" | "EditProductVariants" | null;
    setMainModalType: (modalType: "ProductVariants" | "EditProductVariants" | null) => void;
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
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: ""
        }
    });

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [debouncedQuery, setDebouncedQuery] = useState<string>("");

    const [searchLoading, setSearchLoading] = useState<boolean>(false);
    // const [loadMoreLoading, setLoadMoreLoading] = useState<boolean>(false);
    const [sortKey, setSortKey] = useState<string>("CREATED_AT");
    const [reverse, setReverse] = useState<boolean>(true);

    const listRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (productModalDataFetcher.data) {
            if (productModalDataFetcher.data.success) {
                const productsData = productModalDataFetcher.data.response?.products?.nodes;
                const pageInfo = productModalDataFetcher.data.response?.products?.pageInfo;
                if (productsData?.length) {
                    const data: productModalItemType[] = productsData.map((product: any) => {
                        return {
                            productId: product?.id,
                            productTitle: product?.title,
                            productImage: product.media?.edges[0]?.node?.preview?.image?.url || "",
                            variants: product?.variants?.edges?.map((variant: any) => {
                                return {
                                    id: variant?.node?.id,
                                    name: `${product?.title} - ${variant?.node?.title}`,
                                    price: variant?.node?.price,
                                    image: variant?.node?.media?.edges[0]?.node?.preview?.image?.url || product.media?.edges[0]?.node?.preview?.image?.url || "",
                                }
                            }) ?? []
                        }
                    })
                    setProductModalData({ data, pageInfo });
                    setSearchLoading(false);
                }
            }
        }
    }, [productModalDataFetcher.data])

    useEffect(() => {
        if (mainModalType !== "ProductVariants") return;

        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            setSearchLoading(true);
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery, mainModalType]);

    useEffect(() => {
        if (searchLoading) {
            productModalDataFetcher.submit({
                productRequestBody: JSON.stringify({
                    query: debouncedQuery,
                    sortKey,
                    reverse,
                })
            }, {
                method: "POST",
            });
        }
    }, [searchLoading])

    const onPrevious = () => {
        productModalDataFetcher.submit({
            productRequestBody: JSON.stringify({
                query: debouncedQuery,
                startCursor: productModalData.pageInfo.startCursor,
                sortKey,
                reverse,
            })
        }, {
            method: "POST",
        });
    }

    const onNext = () => {
        productModalDataFetcher.submit({
            productRequestBody: JSON.stringify({
                query: debouncedQuery,
                endCursor: productModalData.pageInfo.endCursor,
                sortKey,
                reverse,
            })
        }, {
            method: "POST",
        });
    }

    const onClose = () => {
        setMainModalType(null);
        setSearchQuery("");
        setDebouncedQuery("");
        setSearchLoading(false);
        // setLoadMoreLoading(false);
        setProductModalData({
            data: [],
            pageInfo: {
                endCursor: "",
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: ""
            }
        });
    };

    const allChecked = (product: productModalItemType) => {
        return product.variants.every((variant) => selectedProducts.some((selectedProduct) => selectedProduct.id === variant.id));
    }

    const someChecked = (product: productModalItemType) => {
        const some = product.variants.some((variant) =>
            selectedProducts.some(
                (selectedProduct) => selectedProduct.id === variant.id
            )
        );

        return some && !allChecked(product);
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

                <Flex
                    justify="space-between"
                    align="center"
                    gap={8}
                    style={{
                        marginBottom: "20px",
                    }}
                >
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder={t("Search products...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Popover
                        trigger={"click"}
                        placement={"bottomLeft"}
                        content={
                            <Flex
                                vertical
                                gap={8}
                            >
                                Sort by
                                <Radio.Group
                                    orientation={"vertical"}
                                    value={sortKey}
                                    onChange={(e) => {
                                        setSortKey(e.target.value);
                                        setSearchLoading(true);
                                    }}
                                    options={[
                                        { value: "TITLE", label: 'Product title' },
                                        { value: "CREATED_AT", label: 'Created' },
                                        { value: "UPDATED_AT", label: 'Updated' },
                                        { value: "INVENTORY_TOTAL", label: 'Inventory' },
                                        { value: "PRODUCT_TYPE", label: 'Product type' },
                                        { value: "VENDOR", label: 'Vendor' },
                                    ]}
                                />
                                <Divider style={{
                                    margin: 0,
                                }} />
                                <Button
                                    type="text"
                                    style={{
                                        color: !reverse ? "#1677ff" : "#000",
                                    }}
                                    onClick={() => {
                                        setReverse(false);
                                        setSearchLoading(true);
                                    }}
                                >
                                    {t("Oldest First")}
                                </Button>
                                <Button
                                    type="text"
                                    style={{
                                        color: reverse ? "#1677ff" : "#000",
                                    }}
                                    onClick={() => {
                                        setReverse(true);
                                        setSearchLoading(true);
                                    }}
                                >
                                    {t("Newest First")}
                                </Button>
                            </Flex>
                        }
                    >
                        <Button
                            icon={<EllipsisOutlined />}
                        />
                    </Popover>
                </Flex>

                {searchLoading && (
                    <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
                        {t("Searching...")}
                    </div>
                )}

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
                    {productModalData.data.map((product) => (
                        <Flex
                            key={product.productId}
                            vertical
                            gap={12}
                            style={{
                                padding: "12px",
                                border: "1px solid #000",
                                borderRadius: "8px",
                                cursor: "pointer",
                            }}
                        >
                            <Flex
                                justify="space-between"
                                gap={12}
                                style={{
                                    padding: "12px",
                                    border: "1px solid #dfe3e8",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                }}
                                onClick={() => {
                                    if (!allChecked(product)) {
                                        const newProductVariants = [...selectedProducts];
                                        product.variants.forEach((variant) => {
                                            if (!newProductVariants.some((p) => p.id === variant.id)) {
                                                newProductVariants.push(variant);
                                            }
                                        });
                                        setSelectedProducts(newProductVariants);
                                    } else {
                                        const newProductVariants = selectedProducts.filter((p) => !product.variants.some((variant) => variant.id === p.id));
                                        setSelectedProducts(newProductVariants);
                                    }
                                }}
                            >
                                <img
                                    src={product.productImage}
                                    alt={product.productTitle}
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
                                        {product.productTitle}
                                    </div>
                                    <Flex
                                        justify="space-between"
                                        align="center"
                                        style={{
                                            width: "100%",
                                        }}
                                    >
                                        <div style={{ color: "#6d7175", fontSize: "14px" }}>
                                            {product?.variants?.length > 1 ? `${product?.variants?.length} variants` : product?.variants[0]?.price}
                                        </div>
                                        <Checkbox
                                            indeterminate={someChecked(product)}
                                            checked={allChecked(product)}
                                        />
                                    </Flex>
                                </Flex>

                            </Flex>
                            {
                                product.variants.length > 1 && (someChecked(product) || allChecked(product)) &&
                                (
                                    product.variants.map((variant) => (
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
                                    ))
                                )
                            }
                        </Flex>
                    ))}
                </div>

                <Flex
                    justify="center"
                    align="center"
                >
                    <Pagination
                        hasPrevious={productModalData.pageInfo.hasPreviousPage}
                        onPrevious={onPrevious}
                        hasNext={productModalData.pageInfo.hasNextPage}
                        onNext={onNext}
                    />
                </Flex>
            </div>
        </div >
    );
};

export default ProductModal;
