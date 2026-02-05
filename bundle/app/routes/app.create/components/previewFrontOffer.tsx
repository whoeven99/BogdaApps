import { ProductVariantsDataType } from "app/types";
import { BasicInformationType, DiscountRulesType, StyleConfigType } from "../route";
import { Statistic } from "antd";
import { useMemo, useRef, useState } from "react";
import PreviewProductListModal, { PreviewProductListDataType, PreviewProductListModalRef } from "./previewProductListModal";

const { Timer } = Statistic

interface PreviewFrontOfferProps {
    basicInformation: BasicInformationType;
    discountRules: DiscountRulesType[];
    styleConfigData: StyleConfigType;
    selectedRuleIndex: number | null;
    setSelectedRuleIndex: (index: number | null) => void;
    previewProduct: ProductVariantsDataType;
}

const PreviewFrontOffer: React.FC<PreviewFrontOfferProps> = (
    {
        basicInformation,
        discountRules,
        styleConfigData,
        selectedRuleIndex,
        setSelectedRuleIndex,
        previewProduct,
    }
) => {
    const previewProductListModalRef = useRef<PreviewProductListModalRef>(null);

    const [selectedProduct, setSelectedProduct] =
        useState<{
            [index: number]: PreviewProductListDataType | null
        }>({});

    const previewPrice: number = useMemo(() => {
        return previewProduct?.price ?? 65;
    }, [previewProduct])

    return (
        <div style={{ position: 'sticky', top: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Live Preview</h3>

            {/* Preview Card */}
            <div style={{
                width: '100%',
                border: '1px solid #dfe3e8',
                borderRadius: '8px',
                padding: '16px',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Card Title */}
                <h3 style={{
                    fontSize: styleConfigData?.title?.fontSize,
                    fontWeight: styleConfigData?.title?.fontWeight,
                    color: styleConfigData?.title?.color,
                    marginBottom: '16px'
                }}>
                    {styleConfigData?.title?.text}
                </h3>

                {/* Countdown Timer (when enabled) */}
                {styleConfigData?.countdown?.enabled && (
                    <div style={{
                        background: '#fff8f0',
                        border: '1px solid #ffd700',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        marginBottom: '16px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '11px', color: '#6d7175', marginBottom: '4px' }}>
                            ⏱️ Limited time offer ends in
                        </div>
                        <Timer
                            type="countdown"
                            value={Date.now() + 1000 * 60 * 60 * styleConfigData?.countdown.duration}
                            styles={{
                                content: {
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    color: styleConfigData?.countdown.color,
                                    fontFamily: 'monospace'
                                }
                            }}
                        />
                    </div>
                )}

                {/* Product Items */}
                {discountRules.map((rule, index) => {
                    return (
                        <div
                            key={index}
                            style={{
                                border: (selectedRuleIndex === null ? rule.selectedByDefault : selectedRuleIndex === index) ? '1px solid #000' : `1px solid ${styleConfigData?.card?.border_color}`,
                                borderRadius: '8px',
                                padding: '12px',
                                marginBottom: '12px',
                                position: 'relative',
                                background: styleConfigData?.card.background_color,
                                cursor: 'pointer'
                            }}
                            onClick={() => setSelectedRuleIndex(index)}
                        >
                            {rule.badgeText &&
                                <div style={{ position: 'absolute', top: '-8px', right: '12px', background: '#000', color: '#fff', padding: '2px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {rule.badgeText}
                                </div>
                            }
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}
                            >
                                <input
                                    type="radio"
                                    name="discount-rule-group"
                                    value={rule.quantity}
                                    checked={selectedRuleIndex === null ? rule.selectedByDefault : selectedRuleIndex === index}
                                    readOnly
                                    style={{ width: '16px', height: '16px' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <strong style={{ fontSize: '14px' }}>{rule.title}</strong>
                                        {!!rule.labelText &&
                                            <span
                                                style={{
                                                    background: styleConfigData?.card?.label_color,
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px'
                                                }}

                                            >
                                                {rule.labelText}
                                            </span>
                                        }
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6d7175' }}>{rule.subtitle}</div>
                                </div>
                                {
                                    ((rule.discount.type === 'percentage' && rule.discount.value === 1) || (rule.discount.type === 'product' && rule.discount.value === 0)) && (
                                        <div style={{ textAlign: 'right' }}>
                                            <strong style={{ fontSize: '16px' }}>€{Number(rule.quantity * previewPrice).toFixed(2)}</strong>
                                        </div>
                                    )
                                }
                                {
                                    (rule.discount.type === 'percentage' && rule.discount.value === 0) && (
                                        <div style={{ textAlign: 'right' }}>
                                            <strong style={{ fontSize: '16px' }}>Free</strong>
                                        </div>
                                    )
                                }
                                {
                                    (rule.discount.type === 'percentage' && rule.discount.value > 0 && rule.discount.value < 1) && (
                                        <div style={{ textAlign: 'right' }}>
                                            <strong style={{ fontSize: '16px' }}>€{Number(rule.quantity * previewPrice * rule.discount.value).toFixed(2)}</strong>
                                            <div style={{ fontSize: '12px', color: '#6d7175', textDecoration: 'line-through' }}>€{Number(rule.quantity * previewPrice).toFixed(2)}</div>
                                        </div>
                                    )
                                }
                                {
                                    (rule.discount.type === 'product' && rule.discount.value > 0) && (
                                        <div style={{ textAlign: 'right' }}>
                                            <strong style={{ fontSize: '16px' }}>€{Number(previewPrice * (rule.quantity - rule.discount.value)).toFixed(2)}</strong>
                                            <div style={{ fontSize: '12px', color: '#6d7175', textDecoration: 'line-through' }}>€{Number(rule.quantity * previewPrice).toFixed(2)}</div>
                                        </div>
                                    )
                                }
                            </div>
                            {(basicInformation.offerType.subtype === "quantity-breaks-different" && (selectedRuleIndex === index || (selectedRuleIndex === null && rule.selectedByDefault)) && previewProduct) &&
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'left',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        marginTop: '8px',
                                        cursor: "default"
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <img
                                            src={previewProduct?.image}
                                            alt={previewProduct.name}
                                            style={{
                                                width: '40px',
                                                height: 'auto',
                                                objectFit: 'cover',
                                                borderRadius: '4px',
                                            }}
                                        />
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'flex-start',
                                                alignItems: 'flex-start',
                                            }}
                                        >
                                            <strong>{previewProduct?.name}</strong>
                                        </div>
                                    </div>
                                    {Array.from({ length: rule.quantity - 1 }).map((_, i) => (
                                        selectedProduct?.[i]
                                            ?
                                            <div
                                                key={selectedProduct[i]?.id}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: 8
                                                }}
                                            >
                                                <img
                                                    src={selectedProduct[i]?.image?.url ||
                                                        "https://via.placeholder.com/100x100?text=No+Image"}
                                                    alt={selectedProduct[i]?.image?.altText || "No Image"}
                                                    style={{
                                                        width: '40px',
                                                        height: 'auto',
                                                        objectFit: 'contain',
                                                        borderRadius: '4px',
                                                        flexShrink: 0,
                                                    }}
                                                />
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
                                                        {selectedProduct[i]?.title}
                                                    </span>

                                                    {selectedProduct[i]?.variants?.length > 1 && <div
                                                        style={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            alignItems: "flex-start",
                                                        }}
                                                    >
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
                                                                selectedProduct[i]?.options?.map((o: any, index: number) => (
                                                                    <select key={index}
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
                                                                        defaultValue={selectedProduct[i]?.selectedOptions?.find((s: any) => s.name === o.name)?.value}
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
                                                <button
                                                    style={{
                                                        fontSize: 14,
                                                        fontWeight: 650,
                                                        fontStyle: "normal",
                                                        fontFamily: "system-ui",
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => {
                                                        setSelectedProduct(prev => {
                                                            const next = { ...prev };
                                                            delete next[i];
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            :
                                            <div
                                                key={i}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <div
                                                    onClick={() => previewProductListModalRef.current?.open(i)}
                                                    style={{
                                                        width: 40,
                                                        height: 40,
                                                        border: "1px solid rgb(233, 233, 233)",
                                                        borderRadius: "4px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontWeight: "bold",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    +
                                                </div>
                                                <div
                                                    onClick={() => previewProductListModalRef.current?.open(i)}
                                                    style={{
                                                        color: "#fff",
                                                        fontSize: "12px",
                                                        lineHeight: "1.4",
                                                        padding: "6px 14px",
                                                        borderRadius: "8px",
                                                        backgroundColor: "var(--kaching-collection-breaks-button-color, #333)",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    Choose
                                                </div>
                                            </div>
                                    ))}
                                </div>
                            }
                        </div>
                    )
                })}
            </div>

            <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '12px', fontStyle: 'italic' }}>
                Note: This is a live preview. Changes will update in real-time when state is connected.
            </p>

            <PreviewProductListModal
                ref={previewProductListModalRef}
                setSelectedProduct={setSelectedProduct}
            />
        </div >
    );
};

export default PreviewFrontOffer;
