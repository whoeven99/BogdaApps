import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { useSelector } from "react-redux";

export interface PreviewProductListDataType {
    id: string;
    title: string;
    image: {
        url: string;
        altText: string;
    };
    price: {
        amount: number;
        currencyCode: string;
    };
    compareAtPrice: {
        amount: number;
        currencyCode: string;
    };
    options: any[];
    variants: any[];
    selectedOptions: {
        name: string;
        value: string;
    }[];
}

interface PreviewProductListModalProps {
    setSelectedProduct: React.Dispatch<
        React.SetStateAction<{
            [index: number]: PreviewProductListDataType | null;
        }>
    >;
}

export type PreviewProductListModalRef = {
    open: (index: number) => void;
    close: () => void;
};

const PreviewProductListModal = forwardRef<PreviewProductListModalRef, PreviewProductListModalProps>((props, ref) => {
    useImperativeHandle(ref, () => ({
        open(index: number) {
            setIsModalVisible(true);
            props.setSelectedProduct((prev: {
                [index: number]: PreviewProductListDataType | null;
            }) => ({
                ...prev,
                [index]: null,
            }));
            setEditIndex(index);
        },
        close() {
            setIsModalVisible(false);
            props.setSelectedProduct(prev => {
                const next = { ...prev };
                delete next[editIndex];
                return next;
            });
            setEditIndex(0);
        },
    }));

    const previewProductModalData = useSelector((state: any) => state.previewProductModalData);

    const [dataSource, setDataSource] = useState<PreviewProductListDataType[]>([]);
    const [editIndex, setEditIndex] = useState<number>(0);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

    const [isModalVisible, setIsModalVisible] = useState(false)

    useEffect(() => {
        if (previewProductModalData.state === "success" && previewProductModalData.data?.length > 0) {
            const newData = previewProductModalData.data?.filter((p: any) => p?.availableForSale)?.map((p: any) => ({
                id: p?.id,
                title: p?.title,
                image: {
                    url: p?.featuredImage?.url,
                    altText: p?.featuredImage?.altText,
                },
                price: {
                    amount: p?.variants?.nodes[0]?.price?.amount,
                    currencyCode: p?.variants?.nodes[0]?.price?.currencyCode,
                },
                compareAtPrice: {
                    amount: p?.variants?.nodes[0]?.compareAtPrice?.amount,
                    currencyCode: p?.variants?.nodes[0]?.compareAtPrice?.currencyCode,
                },
                options: p?.options,
                variants: p?.variants?.nodes
            }));
            console.log("newData: ", newData);
            setDataSource(newData);
        }
    }, [previewProductModalData]);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.4)",
                display: isModalVisible ? "flex" : "none",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 999,
            }}
        >
            <div
                style={{
                    background: "#fff",
                    width: 900,
                    maxHeight: "80vh",
                    borderRadius: 12,
                    display: isModalVisible ? "flex" : "none",
                    flexDirection: "column",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "16px 24px",
                        borderBottom: "1px solid #eee",
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: 600,
                    }}
                >
                    Choose product
                    <span style={{ cursor: "pointer" }} onClick={() => setIsModalVisible(false)}>
                        ✕
                    </span>
                </div>

                {/* Body */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        padding: "24px",
                        overflowY: "auto",
                        maxHeight: "calc(80vh - 64px)",
                    }}
                >
                    {dataSource?.length === 0 ? (
                        <div style={{ padding: "24px", textAlign: "center" }}>No products found</div>
                    ) : (
                        dataSource?.map((p: any) => (
                            <div
                                key={p?.id}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 12,
                                }}
                            >
                                <div style={{ display: "flex", gap: 12 }}>
                                    <div
                                        style={{
                                            width: 100,
                                            flexShrink: 0,
                                        }}
                                    >
                                        <img
                                            src={p?.image?.url ||
                                                "https://via.placeholder.com/100x100?text=No+Image"}
                                            alt={p?.image?.altText || "No Image"}
                                            style={{
                                                width: "100%",
                                                height: "auto",
                                                objectFit: "contain",
                                                borderRadius: 8,
                                                border: "1px solid #e5e5e3",
                                                background: "#fafafa",
                                            }}
                                        />
                                    </div>


                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "flex-start",
                                            gap: 4,
                                            width: "100%",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontWeight: 650,
                                                fontSize: 14,
                                                maxWidth: "100%",
                                                overflowWrap: "anywhere",
                                                wordBreak: "break-word"
                                            }}
                                        >
                                            {p?.title}
                                        </span>

                                        <div>
                                            <span>
                                                {p?.price?.amount} {p?.price?.currencyCode}
                                            </span>
                                            {p?.compareAtPrice?.amount && (
                                                <del style={{ marginLeft: 6, color: "#999" }}>
                                                    {p.compareAtPrice?.amount} {p.compareAtPrice?.currencyCode}
                                                </del>
                                            )}
                                        </div>

                                        {p?.variants?.length > 1 && <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            <div>
                                                {
                                                    p.options?.map((o: any, index: number) => (
                                                        <span key={index}>
                                                            {o.name}{index < p.options?.length - 1 ? " / " : ""}
                                                        </span>
                                                    ))
                                                }
                                            </div>

                                            <div
                                                style={{
                                                    display: "flex",
                                                    minWidth: 0,
                                                    marginRight: 2,
                                                    flexWrap: "wrap",
                                                    gap: 7,
                                                }}
                                            >
                                                {
                                                    p.options?.map((o: any, index: number) => (
                                                        <select
                                                            key={index}
                                                            onChange={(e) => {
                                                                setSelectedOptions({
                                                                    ...selectedOptions,
                                                                    [o.name]: e.target.value,
                                                                });
                                                            }}
                                                            style={{
                                                                fontSize: 14,
                                                                fontWeight: 400,
                                                                fontStyle: "normal",
                                                                fontFamily: "system-ui",
                                                                border: "none",
                                                                padding: "7px 25px 7px 7px",
                                                                margin: 0,
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                                overflow: "hidden",
                                                                backgroundPosition: "right 8px center !important",
                                                                backgroundColor: "#fff",
                                                                backgroundSize: "initial",
                                                                color: "#000",
                                                                outline: "none",
                                                                maxWidth: "100%",
                                                                width: "auto",
                                                                height: "auto",
                                                                minHeight: "auto",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 10,
                                                                cursor: "pointer",
                                                                boxShadow: "inset 0 0 0 1px var(--bar-border-color, rgba(0, 0, 0, .3))",
                                                                borderRadius: 0,
                                                            }}
                                                        >
                                                            {o.optionValues?.map((v: any, index: number) => (
                                                                <option key={index} value={v.name}>
                                                                    {v.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ))
                                                }
                                            </div>
                                        </div>}
                                    </div>
                                </div>

                                <button
                                    style={{
                                        background: "black",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 8,
                                        padding: "10px 18px",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => {
                                        props.setSelectedProduct((prev: {
                                            [index: number]: PreviewProductListDataType | null;
                                        }) => ({
                                            ...prev,
                                            [editIndex]: {
                                                ...p,
                                                selectedOptions: p.options.map((o: any) => ({
                                                    name: o.name,
                                                    value: selectedOptions?.[o.name] ?? o.optionValues[0].name,
                                                })),
                                            },
                                        }));
                                        setEditIndex(0);
                                        setIsModalVisible(false);
                                    }}
                                >
                                    Choose
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div >
    )
})

export default PreviewProductListModal
