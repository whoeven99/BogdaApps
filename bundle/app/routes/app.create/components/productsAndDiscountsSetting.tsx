import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { DiscountRulesType, ProductVariantsDataType } from "../route";
import { Checkbox } from "antd";

interface ProductsAndDiscountsSettingProps {
    selectedProducts: ProductVariantsDataType[];
    setMainModalType: (modalType: "ProductVariants" | "CustomerSegments" | "Customer" | null) => void;
    discountRules: DiscountRulesType[];
    setDiscountRules: (rules: DiscountRulesType[]) => void;
    selectedRuleIndex: number;
    setSelectedRuleIndex: (rule: number) => void;
    selectedOfferType: {
        id: string;
        name: string;
        description: string;
    };
}

const ProductsAndDiscountsSetting: React.FC<ProductsAndDiscountsSettingProps> = ({
    selectedProducts,
    setMainModalType,
    discountRules,
    setDiscountRules,
    selectedRuleIndex,
    setSelectedRuleIndex,
    selectedOfferType
}) => {
    const switchDefaultSelectedItem = (e: number) => {
        const data = discountRules.map((rule) => {
            if (rule?.id == e) {
                rule.selectedByDefault = true;
            } else {
                rule.selectedByDefault = false;
            }
            return rule;
        })

        setDiscountRules(data);
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
            {/* Left Column - Form */}
            <div>
                <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Products & Discounts</h2>

                {/* Product Selection Section */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Products eligible for offer</h3>

                    {selectedProducts.length === 0 ? (
                        <button
                            onClick={() => setMainModalType("ProductVariants")}
                            style={{
                                width: '100%',
                                background: '#ffffff',
                                color: '#202223',
                                padding: '14px 20px',
                                fontSize: '14px',
                                fontWeight: 500,
                                border: '1px solid #dfe3e8',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Add products eligible for offer
                        </button>
                    ) : (
                        <div>
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
                            <div style={{ fontSize: '13px', color: '#6d7175', marginBottom: '12px' }}>
                                {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
                            </div>
                            <button
                                onClick={() => setMainModalType(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#008060',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    padding: 0
                                }}
                            >
                                Edit products
                            </button>
                        </div>
                    )}
                </div>

                {/* Discount Rules Section */}
                <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Discount rules</h3>

                    {discountRules.map((rule, index) => (
                        <div key={index} style={{
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
                                                Quantity
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {/* <span style={{ fontSize: '14px', fontWeight: 500 }}>Buy</span> */}
                                                <input
                                                    type="number"
                                                    value={rule.buyQty}
                                                    onChange={(e) => {
                                                        const newRules = [...discountRules];
                                                        newRules[index].buyQty = parseInt(e.target.value) || 0;
                                                        setDiscountRules(newRules);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        border: '1px solid #dfe3e8',
                                                        borderRadius: '6px',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px', color: '#a0a0a0' }}>
                                                DiscountRate
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={1}
                                                    step={0.01}
                                                    value={rule.discountRate}
                                                    onChange={(e) => {
                                                        let value = Number(e.target.value);

                                                        if (isNaN(value)) value = 0;
                                                        if (value < 0) value = 0;
                                                        if (value > 1) value = 1;

                                                        const newRules = [...discountRules];
                                                        newRules[index].discountRate = value;
                                                        setDiscountRules(newRules);
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        border: '1px solid #dfe3e8',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                                Title
                                            </label>
                                            <input
                                                type="text"
                                                value={rule.title}
                                                onChange={(e) => {
                                                    const newRules = [...discountRules];
                                                    newRules[index].title = e.target.value;
                                                    setDiscountRules(newRules);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
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
                                            <input
                                                type="text"
                                                value={rule.subtitle}
                                                onChange={(e) => {
                                                    const newRules = [...discountRules];
                                                    newRules[index].subtitle = e.target.value;
                                                    setDiscountRules(newRules);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
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
                                            <input
                                                type="text"
                                                value={rule.badgeText}
                                                onChange={(e) => {
                                                    const newRules = [...discountRules];
                                                    newRules[index].badgeText = e.target.value;
                                                    setDiscountRules(newRules);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
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
                                        <input
                                            type="text"
                                            value={rule.labelText}
                                            onChange={(e) => {
                                                const newRules = [...discountRules];
                                                newRules[index].labelText = e.target.value;
                                                setDiscountRules(newRules);
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                border: '1px solid #dfe3e8',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <Checkbox
                                                checked={rule.selectedByDefault}
                                                onChange={() => switchDefaultSelectedItem(rule.id)}
                                            />
                                            <span style={{ fontSize: '14px' }}>Selected by default</span>
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                        {/* TODO: Add image upload */}
                                        {/* <button style={{
                                                                flex: 1,
                                                                padding: '10px',
                                                                border: '1px solid rgba(223, 227, 232, 1)',
                                                                borderRadius: '6px',
                                                                background: '#fff',
                                                                cursor: 'pointer',
                                                                fontSize: '13px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '6px'
                                                            }}>
                                                                🖼️ Add image
                                                            </button> */}
                                        {/* {!rule.upsellProducts.length &&
                                                                <Button
                                                                    onClick={() => {
                                                                        const newRule = [...discountRules];
                                                                        newRule[index].upsellProducts.push({
                                                                            id: Date.now(),
                                                                            variantid: '',
                                                                            upsellText: '+ Add at 20% discount',
                                                                            discountType: 'percentage',
                                                                            discountValue: {
                                                                                percentage: 20,
                                                                                amount: 0,
                                                                                specific: 0,
                                                                            },
                                                                            selectedByDefault: false,
                                                                            visibleWithoutCheck: false,
                                                                        });
                                                                        setDiscountRules(newRule);
                                                                    }}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '10px',
                                                                        border: '1px solid #dfe3e8',
                                                                        borderRadius: '6px',
                                                                        background: '#fff',
                                                                        cursor: 'pointer',
                                                                        fontSize: '13px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                    }}
                                                                >
                                                                    📈 {t("Add upsell")}
                                                                </Button>
                                                            } */}
                                        {/* {!rule.freegiftProducts.length &&
                                                                <Button
                                                                    onClick={() => {
                                                                        const newRule = [...discountRules];
                                                                        newRule[index].freegiftProducts.push({
                                                                            id: Date.now(),
                                                                            variantid: '',
                                                                            freegiftText: '+ FREE Gift',
                                                                            showOriginalPrice: false
                                                                        });
                                                                        setDiscountRules(newRule);
                                                                    }}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: '10px',
                                                                        border: '1px solid #dfe3e8',
                                                                        borderRadius: '6px',
                                                                        background: '#fff',
                                                                        cursor: 'pointer',
                                                                        fontSize: '13px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                    }}
                                                                >
                                                                    🎁 {t("Add free gift")}
                                                                </Button>
                                                            } */}
                                    </div>

                                    {/* {rule.upsellProducts.length > 0 &&
                                                            <div style={{ marginBottom: '16px' }}>
                                                                {rule.upsellProducts.map((upsell, upsellIndex) => (
                                                                    <Space
                                                                        key={upsellIndex}
                                                                        orientation="vertical"
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '16px',
                                                                            border: '1px solid #dfe3e8',
                                                                            borderRadius: '6px',
                                                                            marginBottom: '16px',
                                                                        }}
                                                                    >
                                                                        <Flex justify="space-between" align="center" gap={16}>
                                                                            <Text>{t("Upsell")}</Text>
                                                                            <Button
                                                                                type="link"
                                                                                onClick={() => {
                                                                                    setDiscountRules((prev) => {
                                                                                        const newRules = [...prev];
                                                                                        newRules[index].upsellProducts =
                                                                                            newRules[index].upsellProducts.filter(
                                                                                                (x) => x.id !== upsell.id
                                                                                            );
                                                                                        return newRules;
                                                                                    });
                                                                                }}
                                                                            >
                                                                                {t("Remove upsell")}
                                                                            </Button>
                                                                        </Flex>

                                                                        <Button
                                                                            type="primary"
                                                                            style={{
                                                                                width: '100%'
                                                                            }}
                                                                        >
                                                                            {t("Select a product")}
                                                                        </Button>

                                                                        <Flex justify="space-between" gap={16}>
                                                                            <Flex
                                                                                align="left"
                                                                                vertical
                                                                                flex={1}
                                                                            >
                                                                                <Text>{t("Price")}</Text>
                                                                                <Select
                                                                                    style={{
                                                                                        width: '100%',
                                                                                    }}
                                                                                    options={[
                                                                                        { value: 'default', label: t('Default') },
                                                                                        { value: 'percentage', label: t('Discounted % (e.g. 25% off)') },
                                                                                        { value: 'amount', label: t('Discounted CA$ (e.g. CA$10 off)') },
                                                                                        { value: 'specific', label: t('Specific (e.g. CA$29)') },
                                                                                    ]}
                                                                                    value={upsell.discountType}
                                                                                    onChange={(value) => {
                                                                                        const newRules = [...discountRules];
                                                                                        newRules[index].upsellProducts[upsellIndex].discountType = value;
                                                                                        setDiscountRules(newRules);
                                                                                    }}
                                                                                    dropdownMatchSelectWidth
                                                                                    className="ellipsis-select"
                                                                                />
                                                                            </Flex>
                                                                            {upsell.discountType != "default"
                                                                                &&
                                                                                <Flex
                                                                                    align="left"
                                                                                    vertical
                                                                                    flex={1}
                                                                                >
                                                                                    <Text>{t(upsell.discountType != "specific" ? "Discount per item" : "Total price")}</Text>
                                                                                    <InputNumber
                                                                                        style={{
                                                                                            width: '100%',
                                                                                        }}
                                                                                        onChange={(value) => {
                                                                                            const newRules = [...discountRules];
                                                                                            const discountType = newRules[index].upsellProducts[upsellIndex].discountType;
                                                                                            if (typeof value === "number" && value) {
                                                                                                if (discountType === 'percentage') {
                                                                                                    newRules[index].upsellProducts[upsellIndex].discountValue.percentage = value;
                                                                                                } else if (discountType === 'amount') {
                                                                                                    newRules[index].upsellProducts[upsellIndex].discountValue.amount = value;
                                                                                                } else if (discountType === 'specific') {
                                                                                                    newRules[index].upsellProducts[upsellIndex].discountValue.specific = value;
                                                                                                }
                                                                                            }
                                                                                            setDiscountRules(newRules);
                                                                                        }}
                                                                                        value={upsell.discountValue[upsell.discountType as "percentage" | "amount" | "specific"]}
                                                                                    />
                                                                                </Flex>
                                                                            }
                                                                        </Flex>

                                                                        <Flex align="left" vertical>
                                                                            <Text>{t("Text")}</Text>
                                                                            <Input
                                                                                style={{
                                                                                    width: '100%',
                                                                                }}
                                                                                onChange={(e) => {
                                                                                    const newRules = [...discountRules];
                                                                                    newRules[index].upsellProducts[upsellIndex].upsellText = e.target.value;
                                                                                    setDiscountRules(newRules);
                                                                                }}
                                                                                value={upsell.upsellText}
                                                                            />
                                                                        </Flex>

                                                                        <Flex align="center" wrap gap={16}>
                                                                            <Checkbox
                                                                                onChange={(e) => {
                                                                                    setDiscountRules((prev) => {
                                                                                        const newRules = [...prev];
                                                                                        newRules[index].upsellProducts[upsellIndex].selectedByDefault = e.target.checked;
                                                                                        return newRules;
                                                                                    });
                                                                                }}
                                                                                checked={upsell.selectedByDefault}
                                                                            >
                                                                                {t("Selected by default")}
                                                                            </Checkbox>
                                                                            <Checkbox
                                                                                onChange={(e) => {
                                                                                    setDiscountRules((prev) => {
                                                                                        const newRules = [...prev];
                                                                                        newRules[index].upsellProducts[upsellIndex].visibleWithoutCheck = e.target.checked;
                                                                                        return newRules;
                                                                                    });
                                                                                }}
                                                                                checked={upsell.visibleWithoutCheck}
                                                                            >
                                                                                {t("Visible only when bar is selected")}
                                                                            </Checkbox>
                                                                        </Flex>
                                                                    </Space>
                                                                ))}
                                                                <Button
                                                                    onClick={() => {
                                                                        const newRules = [...discountRules];
                                                                        newRules[index].upsellProducts.push({
                                                                            id: Date.now(),
                                                                            variantid: '',
                                                                            upsellText: '+ Add at 20% discount',
                                                                            discountType: 'percentage',
                                                                            discountValue: {
                                                                                percentage: 20,
                                                                                amount: 0,
                                                                                specific: 0,
                                                                            },
                                                                            selectedByDefault: false,
                                                                            visibleWithoutCheck: false,
                                                                        });
                                                                        setDiscountRules(newRules);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '10px',
                                                                        border: '1px solid #dfe3e8',
                                                                        borderRadius: '6px',
                                                                        background: '#fff',
                                                                        cursor: 'pointer',
                                                                        fontSize: '13px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                    }}
                                                                >
                                                                    📈 {t("Add upsell")}
                                                                </Button>
                                                            </div>
                                                        } */}

                                    {/* {rule.freegiftProducts.length > 0 &&
                                                            <div style={{ marginBottom: '16px' }}>
                                                                {rule.freegiftProducts.map((freegift, freegiftIndex) => (
                                                                    <Space
                                                                        key={freegiftIndex}
                                                                        orientation="vertical"
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '16px',
                                                                            border: '1px solid #dfe3e8',
                                                                            borderRadius: '6px',
                                                                            marginBottom: '16px',
                                                                        }}
                                                                    >
                                                                        <Flex justify="space-between" align="center" gap={16}>
                                                                            <Text>{t("Free gift")}</Text>
                                                                            <Button
                                                                                type="link"
                                                                                onClick={() => {
                                                                                    setDiscountRules((prev) => {
                                                                                        const newRules = [...prev];
                                                                                        newRules[index].freegiftProducts =
                                                                                            newRules[index].freegiftProducts.filter(
                                                                                                (x) => x.id !== freegift.id
                                                                                            );
                                                                                        return newRules;
                                                                                    });
                                                                                }}
                                                                            >
                                                                                {t("Remove free gift")}
                                                                            </Button>
                                                                        </Flex>

                                                                        <Button
                                                                            type="primary"
                                                                            style={{
                                                                                width: '100%'
                                                                            }}
                                                                        >
                                                                            {t("Select a product")}
                                                                        </Button>

                                                                        <Flex align="left" vertical>
                                                                            <Text>{t("Text")}</Text>
                                                                            <Input
                                                                                style={{
                                                                                    width: '100%',
                                                                                }}
                                                                                onChange={(e) => {
                                                                                    const newRules = [...discountRules];
                                                                                    newRules[index].freegiftProducts[freegiftIndex].freegiftText = e.target.value;
                                                                                    setDiscountRules(newRules);
                                                                                }}
                                                                                value={freegift.freegiftText}
                                                                            />
                                                                        </Flex>

                                                                        <Flex align="center" wrap gap={16}>
                                                                            <Checkbox
                                                                                onChange={(e) => {
                                                                                    setDiscountRules((prev) => {
                                                                                        const newRules = [...prev];
                                                                                        newRules[index].freegiftProducts[freegiftIndex].showOriginalPrice = e.target.checked;
                                                                                        return newRules;
                                                                                    });
                                                                                }}
                                                                                checked={freegift.showOriginalPrice}
                                                                            >
                                                                                {t("Show original price")}
                                                                            </Checkbox>
                                                                        </Flex>
                                                                    </Space>
                                                                ))}
                                                                <Button
                                                                    onClick={() => {
                                                                        const newRule = [...discountRules];
                                                                        newRule[index].freegiftProducts.push({
                                                                            id: Date.now(),
                                                                            variantid: '',
                                                                            freegiftText: '+ FREE Gift',
                                                                            showOriginalPrice: false
                                                                        });
                                                                        setDiscountRules(newRule);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '10px',
                                                                        border: '1px solid #dfe3e8',
                                                                        borderRadius: '6px',
                                                                        background: '#fff',
                                                                        cursor: 'pointer',
                                                                        fontSize: '13px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                    }}
                                                                >
                                                                    🎁 {t("Add free gift")}
                                                                </Button>
                                                            </div>
                                                        } */}

                                    {/* <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            paddingTop: '16px',
                                                            borderTop: '1px solid #dfe3e8'
                                                        }}>
                                                            <Checkbox
                                                                onChange={(e) => {
                                                                    setDiscountRules(() => {
                                                                        const newRules = [...discountRules];
                                                                        newRules[index].showAsSoldOut = e.target.checked;
                                                                        return newRules;
                                                                    });
                                                                }}
                                                                checked={rule.showAsSoldOut}
                                                            >
                                                                {t("Show as sold out")}
                                                            </Checkbox>
                                                        </div> */}
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
                                buyQty: discountRules.length + 1,
                                discountRate: 0.9,
                                title: 'Item Title',
                                subtitle: 'Item Subtitle',
                                labelText: 'Save {{saved_percentage}}',
                                badgeText: 'Badge Text',
                                selectedByDefault: false,
                                upsellProducts: [],
                                freegiftProducts: [],
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
            </div>

            {/* Right Column - Preview */}
            <div style={{ position: 'sticky', top: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Preview</h3>
                <p className="polaris-text-subdued" style={{ fontSize: '13px', marginBottom: '12px' }}>
                    {selectedOfferType.description}
                </p>

                {/* Preview Card */}
                <div style={{
                    width: '100%',
                    border: '1px solid #dfe3e8',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {selectedOfferType.id === 'quantity-breaks-same' &&
                        discountRules.map((rule, index) => {
                            return (
                                <div
                                    key={index}
                                    style={{
                                        border: selectedRuleIndex === index ? '1px solid #000' : `1px solid #E5E5E5`,
                                        borderRadius: '8px',
                                        padding: '12px',
                                        marginBottom: '12px',
                                        position: 'relative',
                                        background: rule.badgeText ? '#ffffff' : '#f9fafb',
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
                                            value={rule.buyQty}
                                            readOnly
                                            checked={selectedRuleIndex === index}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                <strong style={{ fontSize: '14px' }}>{rule.title}</strong>
                                                {rule.discountRate < 1 &&
                                                    <span style={{
                                                        background: '#f0f0f0',
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
                                            rule.discountRate === 1 && (
                                                <div style={{ textAlign: 'right' }}>
                                                    <strong style={{ fontSize: '16px' }}>€{Number(rule.buyQty * 65).toFixed(2)}</strong>
                                                </div>
                                            )
                                        }
                                        {
                                            rule.discountRate === 0 && (
                                                <div style={{ textAlign: 'right' }}>
                                                    <strong style={{ fontSize: '16px' }}>Free</strong>
                                                </div>
                                            )
                                        }
                                        {
                                            (rule.discountRate > 0 && rule.discountRate < 1
                                            ) && (
                                                <div style={{ textAlign: 'right' }}>
                                                    <strong style={{ fontSize: '16px' }}>€{Number(rule.buyQty * 65 * rule.discountRate).toFixed(2)}</strong>
                                                    <div style={{ fontSize: '12px', color: '#6d7175', textDecoration: 'line-through' }}>€{Number(rule.buyQty * 65).toFixed(2)}</div>
                                                </div>
                                            )
                                        }
                                    </div>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
        </div>
    )
}

export default ProductsAndDiscountsSetting