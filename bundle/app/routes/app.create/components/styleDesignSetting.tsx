import { Checkbox, Statistic } from "antd";
import { DiscountRulesType, StyleConfigType } from "../route";

const { Timer } = Statistic;

interface StyleConfigDataProps {
    styleConfigData: StyleConfigType;
    setStyleConfigData: (styleConfigData: StyleConfigType) => void;
    discountRules: DiscountRulesType[];
    selectedOfferType: {
        id: string;
        name: string;
        description: string;
    };
    selectedRuleIndex: number;
    setSelectedRuleIndex: (selectedRuleIndex: number) => void;
}

const StyleDesignSetting: React.FC<StyleConfigDataProps> = ({
    styleConfigData,
    setStyleConfigData,
    discountRules,
    selectedOfferType,
    selectedRuleIndex,
    setSelectedRuleIndex
}) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
            {/* Left Column - Form */}
            <div>
                <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Style Design</h2>
                <p className="polaris-text-subdued">Customize the appearance of your bundle widget</p>

                {/* Layout Format */}
                <div style={{ marginTop: '24px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 500, display: 'block', marginBottom: '12px' }}>
                        Layout Format
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        <div
                            onClick={() => setStyleConfigData({ ...styleConfigData, base_style: 'vertical_stack' })}
                            style={{
                                border: styleConfigData.base_style === 'vertical_stack' ? '2px solid #008060' : '2px solid #dfe3e8',
                                borderRadius: '8px',
                                padding: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'

                            }}>
                            <div style={{ fontWeight: 500, marginBottom: '4px' }}>Vertical Stack</div>
                            <div style={{ fontSize: '12px', color: '#6d7175' }}>Products stacked vertically</div>
                        </div>
                        <div
                            onClick={() => setStyleConfigData({ ...styleConfigData, base_style: 'horizontal_grid' })}
                            style={{
                                border: styleConfigData.base_style === 'horizontal_grid' ? '2px solid #008060' : '2px solid #dfe3e8',
                                borderRadius: '8px',
                                padding: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}>
                            <div style={{ fontWeight: 500, marginBottom: '4px' }}>Horizontal Grid</div>
                            <div style={{ fontSize: '12px', color: '#6d7175' }}>Products in a row</div>
                        </div>
                        <div
                            onClick={() => setStyleConfigData({ ...styleConfigData, base_style: 'card_grid' })}
                            style={{
                                border: styleConfigData.base_style === 'card_grid' ? '2px solid #008060' : '2px solid #dfe3e8',
                                borderRadius: '8px',
                                padding: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}>
                            <div style={{ fontWeight: 500, marginBottom: '4px' }}>Card Grid</div>
                            <div style={{ fontSize: '12px', color: '#6d7175' }}>2x2 grid layout</div>
                        </div>
                        <div
                            onClick={() => setStyleConfigData({ ...styleConfigData, base_style: 'compact_list' })}
                            style={{
                                border: styleConfigData.base_style === 'compact_list' ? '2px solid #008060' : '2px solid #dfe3e8',
                                borderRadius: '8px',
                                padding: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}>
                            <div style={{ fontWeight: 500, marginBottom: '4px' }}>Compact List</div>
                            <div style={{ fontSize: '12px', color: '#6d7175' }}>Condensed view</div>
                        </div>
                    </div>
                </div>

                {/* Card Colors */}
                <div style={{ marginTop: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Card Colors</h3>
                    <div className="polaris-grid">
                        <label style={{ fontSize: '14px', fontWeight: 500 }}>
                            Card Background Color
                            <input
                                type="color"
                                value={styleConfigData?.card_background_color}
                                onChange={(e) => {
                                    setStyleConfigData({
                                        ...styleConfigData,
                                        card_background_color: e.target.value
                                    })
                                }}
                                style={{
                                    width: '100%',
                                    height: '40px',
                                    marginTop: '8px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px'
                                }}
                            />
                        </label>
                        <label style={{ fontSize: '14px', fontWeight: 500 }}>
                            Card Label Color
                            <input
                                type="color"
                                value={styleConfigData?.card_label_color}
                                onChange={(e) => {
                                    setStyleConfigData({
                                        ...styleConfigData,
                                        card_label_color: e.target.value
                                    })
                                }}
                                style={{
                                    width: '100%',
                                    height: '40px',
                                    marginTop: '8px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px'
                                }}
                            />
                        </label>
                        {/* <label style={{ fontSize: '14px', fontWeight: 500 }}>
                                            Border Style
                                            <select
                                                defaultValue="solid"
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    marginTop: '8px',
                                                    border: '1px solid #dfe3e8',
                                                    borderRadius: '6px',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                <option value="solid">Solid</option>
                                                <option value="dashed">Dashed</option>
                                                <option value="dotted">Dotted</option>
                                                <option value="none">None</option>
                                            </select>
                                        </label> */}
                        <label style={{ fontSize: '14px', fontWeight: 500 }}>
                            Border Color
                            <input
                                type="color"
                                value={styleConfigData?.card_border_color}
                                onChange={(e) => {
                                    setStyleConfigData({
                                        ...styleConfigData,
                                        card_border_color: e.target.value
                                    })
                                }}
                                style={{
                                    width: '100%',
                                    height: '40px',
                                    marginTop: '8px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px'
                                }}
                            />
                        </label>
                    </div>
                </div>

                {/* Card Title */}
                <div style={{ marginTop: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Card Title</h3>
                    <div className="polaris-grid">
                        <label style={{ fontSize: '14px', fontWeight: 500 }}>
                            Title Text
                            <input
                                type="text"
                                value={styleConfigData?.card_title_text}
                                onChange={(e) => {
                                    setStyleConfigData({
                                        ...styleConfigData,
                                        card_title_text: e.target.value
                                    })
                                }}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    marginTop: '8px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                }}
                            />
                        </label>
                        <label style={{ fontSize: '14px', fontWeight: 500 }}>
                            Font Size
                            <select
                                value={styleConfigData?.card_title_text_fontSize}
                                onChange={(e) => {
                                    setStyleConfigData({
                                        ...styleConfigData,
                                        card_title_text_fontSize: e.target.value
                                    })
                                }}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    marginTop: '8px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                }}
                            >
                                <option value="12px">12px</option>
                                <option value="14px">14px</option>
                                <option value="16px">16px</option>
                                <option value="18px">18px</option>
                                <option value="20px">20px</option>
                                <option value="24px">24px</option>
                                <option value="28px">28px</option>
                            </select>
                        </label>
                        <label style={{ fontSize: '14px', fontWeight: 500 }}>
                            Font Style
                            <select
                                value={styleConfigData?.card_title_text_fontStyle}
                                onChange={(e) => {
                                    setStyleConfigData({
                                        ...styleConfigData,
                                        card_title_text_fontStyle: e.target.value as "normal" | "bold" | "300"
                                    })
                                }}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    marginTop: '8px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                }}
                            >
                                <option value="normal">Normal</option>
                                <option value="bold">Bold</option>
                                {/* <option value="600">Semi Bold</option> */}
                                <option value="300">Light</option>
                            </select>
                        </label>
                        <label style={{ fontSize: '14px', fontWeight: 500 }}>
                            Title Color
                            <input
                                type="color"
                                value={styleConfigData?.card_title_color}
                                onChange={(e) => {
                                    setStyleConfigData({
                                        ...styleConfigData,
                                        card_title_color: e.target.value
                                    })
                                }}
                                style={{
                                    width: '100%',
                                    height: '40px',
                                    marginTop: '8px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px'
                                }}
                            />
                        </label>
                    </div>
                </div>

                {/* Button Styles */}
                <div style={{ marginTop: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Button Styles</h3>
                    <div className="polaris-grid">
                        <label style={{ fontSize: '14px', fontWeight: 500 }}>
                            Primary Color
                            <input
                                type="color"
                                value={styleConfigData?.card_button_primaryColor}
                                onChange={(e) => {
                                    setStyleConfigData({
                                        ...styleConfigData,
                                        card_button_primaryColor: e.target.value
                                    })
                                }}
                                style={{
                                    width: '100%',
                                    height: '40px',
                                    marginTop: '8px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px'
                                }}
                            />
                        </label>
                        <label style={{ fontSize: '14px', fontWeight: 500 }}>
                            Button Text
                            <input
                                type="text"
                                value={styleConfigData?.card_button_text}
                                onChange={(e) => {
                                    setStyleConfigData({
                                        ...styleConfigData,
                                        card_button_text: e.target.value
                                    })
                                }}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    marginTop: '8px',
                                    border: '1px solid #dfe3e8',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                }}
                            />
                        </label>
                    </div>
                </div>

                {/* Promotional Features */}
                <div style={{ marginTop: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Promotional Features</h3>

                    {/* <div style={{
                                        border: '1px solid #dfe3e8',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        marginBottom: '16px'
                                    }}>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                defaultChecked={true}
                                                style={{ marginRight: '8px', width: '16px', height: '16px' }}
                                            />
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Show Strikethrough Price</span>
                                        </label>
                                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                                            Display original price with strikethrough to highlight savings
                                        </p>
                                    </div> */}

                    <div style={{
                        border: '1px solid #dfe3e8',
                        borderRadius: '8px',
                        padding: '16px'
                    }}>
                        <Checkbox
                            checked={styleConfigData?.enable_countdown_timer}
                            onChange={(e) =>
                                setStyleConfigData({ ...styleConfigData, enable_countdown_timer: !styleConfigData?.enable_countdown_timer })
                            }
                        >
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Enable Countdown Timer</span>
                        </Checkbox>
                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                            Add urgency with a countdown timer
                        </p>

                        <div style={{ marginTop: '12px', marginLeft: '24px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 500 }}>
                                Timer Duration
                                <select
                                    value={styleConfigData?.countdown_timer_config?.timer_duration}
                                    onChange={(e) => setStyleConfigData({ ...styleConfigData, countdown_timer_config: { ...styleConfigData?.countdown_timer_config, timer_duration: Number(e.target.value) } })}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        marginTop: '8px',
                                        border: '1px solid #dfe3e8',
                                        borderRadius: '6px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="1">1 Hour</option>
                                    <option value="6">6 Hours</option>
                                    <option value="12">12 Hours</option>
                                    <option value="24">24 Hours</option>
                                    <option value="48">48 Hours</option>
                                    <option value="72">72 Hours</option>
                                </select>
                            </label>

                            {/* <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginTop: '12px' }}>
                                                Timer Style
                                                <select
                                                    defaultValue="minimal"
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px 12px',
                                                        marginTop: '8px',
                                                        border: '1px solid #dfe3e8',
                                                        borderRadius: '6px',
                                                        fontSize: '14px'
                                                    }}
                                                >
                                                    <option value="minimal">Minimal (00:00:00)</option>
                                                    <option value="badge">Badge Style</option>
                                                    <option value="boxed">Boxed Numbers</option>
                                                </select>
                                            </label> */}

                            <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginTop: '12px' }}>
                                Timer Color
                                <input
                                    type="color"
                                    value={styleConfigData?.countdown_timer_config?.timer_color}
                                    onChange={(e) => setStyleConfigData({ ...styleConfigData, countdown_timer_config: { ...styleConfigData?.countdown_timer_config, timer_color: e.target.value } })}
                                    style={{
                                        width: '100%',
                                        height: '40px',
                                        marginTop: '8px',
                                        border: '1px solid #dfe3e8',
                                        borderRadius: '6px'
                                    }}
                                />
                            </label>
                        </div>
                    </div>
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
                        fontSize: styleConfigData?.card_title_text_fontSize,
                        fontWeight: styleConfigData?.card_title_text_fontStyle,
                        color: styleConfigData?.card_title_color,
                        marginBottom: '16px'
                    }}>
                        {styleConfigData?.card_title_text}
                    </h3>

                    {/* Countdown Timer (when enabled) */}
                    {
                        styleConfigData?.enable_countdown_timer && (
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
                                    value={Date.now() + 1000 * 60 * 60 * styleConfigData?.countdown_timer_config.timer_duration}
                                    styles={{
                                        content: {
                                            fontSize: '18px',
                                            fontWeight: 600,
                                            color: styleConfigData?.countdown_timer_config.timer_color,
                                            fontFamily: 'monospace'
                                        }
                                    }}
                                />
                            </div>
                        )}

                    {/* Product Items */}
                    {selectedOfferType.id === 'quantity-breaks-same' && (
                        <>
                            {discountRules.map((rule, index) => {
                                return (
                                    <div
                                        key={index}
                                        style={{
                                            border: selectedRuleIndex === index ? '1px solid #000' : `1px solid ${styleConfigData?.card_border_color}`,
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
                                                        <span
                                                            style={{
                                                                background: styleConfigData?.card_label_color,
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
                            })}
                        </>
                    )}

                    {/* Add to Cart Button */}
                    <button style={{
                        width: '100%',
                        background: styleConfigData?.card_button_primaryColor,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginTop: '12px'
                    }}>
                        {styleConfigData?.card_button_text}
                    </button>

                    {/* Features/Benefits */}
                    <div style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #e0e0e0',
                        fontSize: '12px',
                        color: '#6d7175'
                    }}>
                        <div style={{ marginBottom: '6px' }}>✓ Free shipping on bundles</div>
                        <div style={{ marginBottom: '6px' }}>✓ 30-day money-back guarantee</div>
                        <div>✓ Exclusive bundle pricing</div>
                    </div>
                </div>

                <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '12px', fontStyle: 'italic' }}>
                    Note: This is a live preview. Changes will update in real-time when state is connected.
                </p>
            </div>
        </div>
    );
};

export default StyleDesignSetting