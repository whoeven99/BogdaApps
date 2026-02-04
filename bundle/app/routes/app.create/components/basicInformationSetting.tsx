import { Flex, Input, Select, Statistic, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { BasicInformationType, DiscountRulesType, StyleConfigType } from "../route";
import { ProductVariantsDataType } from "app/types";
import { useEffect, useMemo } from "react";

const { Text } = Typography
const { Timer } = Statistic

interface BasicInformationSettingProps {
    offerTypes: {
        id: string;
        name: string;
    }[];
    previewProduct: ProductVariantsDataType;
    basicInformation: BasicInformationType;
    discountRules: DiscountRulesType[];
    styleConfigData: StyleConfigType;
    selectedRuleIndex: number | null;
    setSelectedRuleIndex: (index: number | null) => void;
    setBasicInformation: (basicInformation: BasicInformationType) => void;
}

const BasicInformationSetting: React.FC<BasicInformationSettingProps> = ({
    offerTypes,
    previewProduct,
    basicInformation,
    discountRules,
    styleConfigData,
    selectedRuleIndex,
    setSelectedRuleIndex,
    setBasicInformation
}) => {
    const { t } = useTranslation();

    const previewPrice: number = useMemo(() => {
        return previewProduct?.price ?? 65;
    }, [previewProduct])

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
            {/* Left Column - Form */}
            <div>
                <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Basic Information</h2>
                <div className="polaris-stack polaris-stack--vertical">
                    <Flex
                        align="left"
                        vertical
                        gap={8}
                        style={{
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                    >
                        <Text>{t("Offer Name")}</Text>
                        <Input
                            style={{
                                width: '100%',
                            }}
                            placeholder="e.g., Summer Bundle Deal"
                            onChange={(e) => {
                                setBasicInformation({
                                    ...basicInformation,
                                    displayName: e.target.value
                                })
                            }}
                            value={basicInformation.displayName}
                        />
                    </Flex>

                    <Flex
                        align="left"
                        vertical
                        gap={8}
                        style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            marginTop: '16px'
                        }}
                    >
                        <Text>{t("Offer Type")}</Text>
                        <Select
                            style={{
                                width: '100%',
                            }}
                            options={offerTypes.map(type => (
                                {
                                    value: type.id,
                                    label: type.name
                                }
                            ))}
                            value={basicInformation.offerType.subtype}
                            onChange={(value) => {
                                setBasicInformation({
                                    ...basicInformation,
                                    offerType: {
                                        ...basicInformation.offerType,
                                        subtype: value
                                    }
                                })
                            }}
                        />
                    </Flex>
                </div>
            </div>

            {/* Right Column - Preview */}
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
                    {
                        styleConfigData?.countdown?.enabled && (
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
                                            <div
                                                key={i}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <div

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
            </div>
        </div >
    );
};

export default BasicInformationSetting;