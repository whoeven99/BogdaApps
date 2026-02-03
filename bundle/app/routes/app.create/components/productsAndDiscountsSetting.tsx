import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { BasicInformationType, DiscountRulesType, ProductVariantsDataType, StyleConfigType, TargetingSettingsType } from "../route";
import { Button, Checkbox, Flex, Input, InputNumber, Select, Space, Statistic } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

const { Timer } = Statistic;

interface ProductsAndDiscountsSettingProps {
    previewPrice: number;
    selectedProducts: ProductVariantsDataType[];
    setMainModalType: (modalType: "ProductVariants" | "EditProductVariants" | null) => void;
    basicInformation: BasicInformationType;
    discountRules: DiscountRulesType[];
    styleConfigData: StyleConfigType;
    setDiscountRules: (rules: DiscountRulesType[]) => void;
    selectedRuleIndex: number | null;
    setSelectedRuleIndex: (rule: number | null) => void;
}

const ProductsAndDiscountsSetting: React.FC<ProductsAndDiscountsSettingProps> = ({
    previewPrice,
    selectedProducts,
    setMainModalType,
    basicInformation,
    discountRules,
    styleConfigData,
    setDiscountRules,
    selectedRuleIndex,
    setSelectedRuleIndex,
}) => {
    const { t } = useTranslation();

    const ruleContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const prevLengthRef = useRef(discountRules.length);

    const defaultRuleOptions = useMemo(() => {
        return discountRules.map((rule) => ({
            value: rule.id,
            label: rule.title,
        }))
    }, [discountRules])

    const selectedDefaultRuleOption = useMemo(() => {
        const selectedRule = discountRules.find((rule) => rule.id == selectedRuleIndex) || discountRules.find((rule) => rule.selectedByDefault)
        return selectedRule?.id;
    }, [discountRules, selectedRuleIndex])

    useEffect(() => {
        if (discountRules.length > prevLengthRef.current) {
            const lastRule = discountRules[discountRules.length - 1];
            const el = ruleContainerRefs.current[lastRule.id];

            if (el) {
                el.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start', // 或 'center'
                });
            }
        }

        prevLengthRef.current = discountRules.length;
    }, [discountRules.length]);

    useEffect(() => {
        console.log(discountRules);
    }, [discountRules])

    const handleDefaultSelectChange = (value: number) => {
        const data = discountRules.map((rule) => {
            if (rule?.id == value) {
                rule.selectedByDefault = true;
            } else {
                rule.selectedByDefault = false;
            }
            return rule;
        })
        setSelectedRuleIndex(null)
        setDiscountRules(data);
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
            {/* Left Column - Form */}
            <Space vertical size={"large"}>
                <h2 className="polaris-text-heading-md" >Products & Discounts</h2>

                {/* Product Selection Section */}
                <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Products eligible for offer</h3>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        {selectedProducts.slice(0, 3).map(product => (
                            <div key={product.id} style={{
                                border: '1px solid #dfe3e8',
                                borderRadius: '8px',
                                padding: '8px',
                                textAlign: 'center',
                                flex: 1
                            }}>
                                <img src={product.image} alt={product.name} style={{ width: '60px', height: '60px', borderRadius: '6px', marginBottom: '8px' }} />
                                <div style={{ fontSize: '12px', fontWeight: 500 }}>{product.name}</div>
                                <div style={{ fontSize: '11px', color: '#6d7175' }}>{product.price}</div>
                            </div>
                        ))}
                    </div>
                    <Flex
                        justify="space-between"
                        align="center"
                        gap={8}
                        style={{
                            width: '100%',
                        }}
                    >
                        <Button
                            style={{
                                width: '100%',
                            }}
                            onClick={() => setMainModalType("ProductVariants")}
                        >
                            Select products
                        </Button>
                        {!!selectedProducts.length && <Button
                            style={{
                                width: '100%',
                            }}
                            onClick={() => setMainModalType("EditProductVariants")}
                        >
                            View selected({selectedProducts.length})
                        </Button>}
                    </Flex>
                </div>

                <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Selected by default</h3>
                    <Select
                        options={defaultRuleOptions}
                        value={selectedDefaultRuleOption}
                        onChange={(e) => handleDefaultSelectChange(e)}
                        style={{
                            width: '100%',
                        }}
                    />
                </div>

                {/* Discount Rules Section */}
                <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Discount rules</h3>

                    {discountRules.map((rule, index) => (
                        <div
                            key={rule.id}
                            ref={(el) => {
                                ruleContainerRefs.current[rule.id] = el;
                            }}
                            style={{
                                border: '1px solid #dfe3e8',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                overflow: 'hidden'
                            }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '16px',
                                background: rule.isExpanded ? '#f9fafb' : '#fff',
                                borderBottom: rule.isExpanded ? '1px solid #dfe3e8' : 'none',
                                cursor: 'pointer'
                            }}
                                onClick={() => {
                                    const newRules = [...discountRules];
                                    newRules[index].isExpanded = !newRules[index].isExpanded;
                                    setDiscountRules(newRules);
                                }}
                            >
                                <span style={{ fontSize: '16px' }}>🎯</span>
                                <span style={{ flex: 1, fontSize: '14px', fontWeight: 500 }}>
                                    Bar #{index + 1} - {rule.title}
                                </span>

                                <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                    <button
                                        disabled={index === 0}
                                        onClick={() => {
                                            if (index > 0) {
                                                const newRules = [...discountRules];
                                                [newRules[index], newRules[index - 1]] = [newRules[index - 1], newRules[index]];
                                                setDiscountRules(newRules);
                                            }
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                                            opacity: index === 0 ? 0.3 : 1,
                                            padding: '4px'
                                        }}
                                    >
                                        <ArrowUp size={18} />
                                    </button>
                                    <button
                                        disabled={index === discountRules.length - 1}
                                        onClick={() => {
                                            if (index < discountRules.length - 1) {
                                                const newRules = [...discountRules];
                                                [newRules[index], newRules[index + 1]] = [newRules[index + 1], newRules[index]];
                                                setDiscountRules(newRules);
                                            }
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: index === discountRules.length - 1 ? 'not-allowed' : 'pointer',
                                            opacity: index === discountRules.length - 1 ? 0.3 : 1,
                                            padding: '4px'
                                        }}
                                    >
                                        <ArrowDown size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDiscountRules([...discountRules, { ...rule, id: Date.now(), isExpanded: false }]);
                                        }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <Copy size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDiscountRules(discountRules.filter((_, i) => i !== index));
                                        }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#d72c0d' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                {rule.isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>

                            {rule.isExpanded && (
                                <div style={{ padding: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                                                {t(basicInformation.offerType.subtype === "buy-x-get-y" ? "Buy quantity" : "Quantity")}
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {/* <span style={{ fontSize: '14px', fontWeight: 500 }}>Buy</span> */}
                                                {basicInformation.offerType.subtype === "buy-x-get-y" ?
                                                    <InputNumber
                                                        min={0}
                                                        step={1}
                                                        value={rule.quantity - rule.discount.value}
                                                        onChange={(value) => {
                                                            const a = value ?? 0
                                                            console.log(a);
                                                            const newRules = [...discountRules];
                                                            newRules[index].quantity = a + rule.discount.value;
                                                            setDiscountRules(newRules);
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            border: '1px solid #dfe3e8',
                                                            borderRadius: '6px',
                                                            fontSize: '14px',
                                                        }}
                                                    />
                                                    :
                                                    <InputNumber
                                                        min={1}
                                                        step={1}
                                                        value={rule.quantity}
                                                        onChange={(value) => {
                                                            const newRules = [...discountRules];
                                                            newRules[index].quantity = value || 0;
                                                            setDiscountRules(newRules);
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            border: '1px solid #dfe3e8',
                                                            borderRadius: '6px',
                                                            fontSize: '14px',
                                                        }}
                                                    />
                                                }
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px', color: '#a0a0a0' }}>
                                                {t(basicInformation.offerType.subtype === "buy-x-get-y" ? "Get quantity" : "DiscountRate")}
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {basicInformation.offerType.subtype === "buy-x-get-y" ?
                                                    <InputNumber
                                                        min={0}
                                                        step={1}
                                                        value={rule.discount.value}
                                                        onChange={(value) => {
                                                            const a = value ?? 0
                                                            const b = rule.quantity - rule.discount.value;

                                                            console.log(a, b);
                                                            const newRules = [...discountRules];
                                                            newRules[index].discount.value = a;
                                                            newRules[index].quantity = a + b;
                                                            setDiscountRules(newRules);
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            border: '1px solid #dfe3e8',
                                                            borderRadius: '6px',
                                                            fontSize: '14px',
                                                        }}
                                                    />
                                                    :
                                                    <InputNumber
                                                        min={0}
                                                        max={1}
                                                        step={0.01}
                                                        value={rule.discount.value}
                                                        onChange={(value) => {
                                                            const newRules = [...discountRules];
                                                            newRules[index].discount.value = value ?? 0;
                                                            setDiscountRules(newRules);
                                                        }}
                                                        formatter={(value) => {
                                                            if (value === undefined || value === null) return '';
                                                            return String(value).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
                                                        }}
                                                        parser={(value) => {
                                                            if (value === '' || value === undefined || value === null) {
                                                                return 0;
                                                            }
                                                            return Number(value);
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            border: '1px solid #dfe3e8',
                                                            borderRadius: '6px',
                                                            fontSize: '14px',
                                                        }}
                                                    />
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                                Title
                                            </label>
                                            <Input
                                                value={rule.title}
                                                onChange={(e) => {
                                                    const newRules = [...discountRules];
                                                    newRules[index].title = e.target.value;
                                                    setDiscountRules(newRules);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    border: '1px solid #dfe3e8',
                                                    borderRadius: '6px',
                                                    fontSize: '14px'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                                Subtitle
                                            </label>
                                            <Input
                                                value={rule.subtitle}
                                                onChange={(e) => {
                                                    const newRules = [...discountRules];
                                                    newRules[index].subtitle = e.target.value;
                                                    setDiscountRules(newRules);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    border: '1px solid #dfe3e8',
                                                    borderRadius: '6px',
                                                    fontSize: '14px'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                                Badge text
                                            </label>
                                            <Input
                                                value={rule.badgeText}
                                                onChange={(e) => {
                                                    const newRules = [...discountRules];
                                                    newRules[index].badgeText = e.target.value;
                                                    setDiscountRules(newRules);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    border: '1px solid #dfe3e8',
                                                    borderRadius: '6px',
                                                    fontSize: '14px'
                                                }}
                                            />
                                        </div>

                                        {/* <div>
                                                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                                                    Badge style
                                                                </label>
                                                                <select
                                                                    value={rule.badgeStyle}
                                                                    onChange={(e) => {
                                                                        const newRules = [...discountRules];
                                                                        newRules[index].badgeStyle = e.target.value;
                                                                        setDiscountRules(newRules);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '8px 12px',
                                                                        border: '1px solid #dfe3e8',
                                                                        borderRadius: '6px',
                                                                        fontSize: '14px'
                                                                    }}
                                                                >
                                                                    <option value="simple">Simple</option>
                                                                    <option value="bold">Bold</option>
                                                                    <option value="outline">Outline</option>
                                                                </select>
                                                            </div> */}
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                            Label
                                        </label>
                                        <Input
                                            value={rule.labelText}
                                            onChange={(e) => {
                                                const newRules = [...discountRules];
                                                newRules[index].labelText = e.target.value;
                                                setDiscountRules(newRules);
                                            }}
                                            style={{
                                                width: '100%',
                                                border: '1px solid #dfe3e8',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>


                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add new rule button */}
                    <button
                        onClick={() => {
                            setDiscountRules([...discountRules, {
                                id: Date.now(),
                                enabled: true,
                                isExpanded: true,
                                quantity: discountRules.length + 1,
                                discount: basicInformation.offerType.subtype === "buy-x-get-y" ? {
                                    type: "product",
                                    value: 0,
                                    maxDiscount: 100,
                                } : {
                                    type: "percentage",
                                    value: 0.9,
                                    maxDiscount: 100,
                                },
                                discount_reward: [],
                                title: 'Item Title',
                                subtitle: 'Item Subtitle',
                                labelText: 'Save {{saved_percentage}}',
                                badgeText: 'Badge Text',
                                selectedByDefault: false,
                                reward: [],
                                showAsSoldOut: false
                            }]);
                        }}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px dashed #dfe3e8',
                            borderRadius: '8px',
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#008060'
                        }}
                    >
                        + Add discount rule
                    </button>
                </div>
            </Space>

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
                                {rule.badgeText && <div style={{ position: 'absolute', top: '-8px', right: '12px', background: '#000', color: '#fff', padding: '2px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {rule.badgeText}
                                </div>}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                        (rule.discount.type === 'percentage' && rule.discount.value === 1) || (rule.discount.type === 'product' && rule.discount.value === 0) && (
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
                            </div>
                        )
                    })}
                </div>

                <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '12px', fontStyle: 'italic' }}>
                    Note: This is a live preview. Changes will update in real-time when state is connected.
                </p>
            </div>
        </div>
    )
}

export default ProductsAndDiscountsSetting