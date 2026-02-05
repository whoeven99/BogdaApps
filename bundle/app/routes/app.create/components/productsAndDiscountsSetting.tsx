import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { BasicInformationType, DiscountRulesType, StyleConfigType, TargetingSettingsType } from "../route";
import { Button, Checkbox, Flex, Input, InputNumber, Select, Space, Statistic } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ProductVariantsDataType } from "app/types";
import PreviewFrontOffer from "./previewFrontOffer";

const { Timer } = Statistic;

interface ProductsAndDiscountsSettingProps {
    previewProduct: ProductVariantsDataType;
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
    previewProduct,
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
            <PreviewFrontOffer
                basicInformation={basicInformation}
                discountRules={discountRules}
                styleConfigData={styleConfigData}
                selectedRuleIndex={selectedRuleIndex}
                setSelectedRuleIndex={setSelectedRuleIndex}
                previewProduct={previewProduct}
            />
        </div>
    )
}

export default ProductsAndDiscountsSetting