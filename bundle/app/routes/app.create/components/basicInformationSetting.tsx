import { Flex, Input, Select, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { BasicInformationType } from "../route";

const { Text } = Typography

interface BasicInformationSettingProps {
    offerTypes: {
        id: string;
        name: string;
        description: string;
    }[];
    basicInformation: BasicInformationType;
    setBasicInformation: (basicInformation: BasicInformationType) => void;
}

const BasicInformationSetting: React.FC<BasicInformationSettingProps> = ({
    offerTypes,
    basicInformation,
    setBasicInformation
}) => {
    const { t } = useTranslation();

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }} className="lg:grid-cols-[1fr_400px]">
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
                                    offerName: e.target.value
                                })
                            }}
                            value={basicInformation.offerName}
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
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Preview</h3>
                <p className="polaris-text-subdued" style={{ fontSize: '13px', marginBottom: '12px' }}>
                    {offerTypes.find(type => type.id === basicInformation.offerType?.subtype)?.description}
                </p>

                {/* Preview Card */}
                <div style={{
                    width: '100%',
                    minHeight: '300px',
                    border: '1px solid #dfe3e8',
                    borderRadius: '8px',
                    padding: '16px',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {basicInformation.offerType?.subtype === 'quantity-breaks-same' && (
                        <>
                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '12px', background: '#f9fafb' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="radio"
                                        checked={false}
                                        readOnly
                                        style={{
                                            width: 16,
                                            height: 16,
                                            pointerEvents: 'none', // 关键
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <strong style={{ fontSize: '14px' }}>Single</strong>
                                        <div style={{ fontSize: '12px', color: '#6d7175' }}>Standard price</div>
                                    </div>
                                    <strong style={{ fontSize: '16px' }}>€65,00</strong>
                                </div>
                            </div>
                            <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '12px', position: 'relative', background: '#ffffff' }}>
                                <div style={{ position: 'absolute', top: '-8px', right: '12px', background: '#000', color: '#fff', padding: '2px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 600 }}>
                                    Most Popular
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="radio"
                                        checked
                                        readOnly
                                        style={{
                                            width: '16px',
                                            height: '16px'
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <strong style={{ fontSize: '14px' }}>Duo</strong>
                                            <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE €19,50</span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6d7175' }}>You save 15%</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <strong style={{ fontSize: '16px' }}>€110,50</strong>
                                        <div style={{ fontSize: '12px', color: '#6d7175', textDecoration: 'line-through' }}>€130,00</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: 'auto', padding: '12px 0' }}>
                                <strong style={{ fontSize: '13px' }}>Quantity breaks for the same product</strong>
                            </div>
                        </>
                    )}

                    {basicInformation.offerType?.subtype === 'bogo' && (
                        <>
                            <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="radio"
                                    checked
                                    readOnly
                                    style={{
                                        width: '16px',
                                        height: '16px'
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <strong style={{ fontSize: '13px' }}>Buy 1, get 1 free</strong>
                                        <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 50%</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong style={{ fontSize: '14px' }}>€65,00</strong>
                                    <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€130,00</div>
                                </div>
                            </div>
                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="radio"
                                    checked={false}
                                    readOnly
                                    style={{
                                        width: 16,
                                        height: 16,
                                        pointerEvents: 'none', // 关键
                                    }}
                                />                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <strong style={{ fontSize: '13px' }}>Buy 2, get 3 free</strong>
                                        <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 60%</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong style={{ fontSize: '14px' }}>€130,00</strong>
                                    <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€325,00</div>
                                </div>
                            </div>
                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="radio"
                                    checked={false}
                                    readOnly
                                    style={{
                                        width: 16,
                                        height: 16,
                                        pointerEvents: 'none', // 关键
                                    }}
                                />                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <strong style={{ fontSize: '13px' }}>Buy 3, get 6 free</strong>
                                        <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 67%</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong style={{ fontSize: '14px' }}>€195,00</strong>
                                    <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€585,00</div>
                                </div>
                            </div>
                            <div style={{ background: '#e0e0e0', padding: '8px 12px', borderRadius: '6px', textAlign: 'center', fontSize: '12px', marginBottom: '12px' }}>
                                + FREE special gift!
                            </div>
                            <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
                                <strong style={{ fontSize: '13px' }}>Buy X, get Y free (BOGO) deal</strong>
                            </div>
                        </>
                    )}

                    {basicInformation.offerType?.subtype === 'quantity-breaks-different' && (
                        <>
                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: '#f9fafb' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="radio"
                                        checked={false}
                                        readOnly
                                        style={{
                                            width: 16,
                                            height: 16,
                                            pointerEvents: 'none', // 关键
                                        }}
                                    />                                    <div style={{ flex: 1 }}>
                                        <strong style={{ fontSize: '14px' }}>1 pack</strong>
                                        <div style={{ fontSize: '12px', color: '#6d7175' }}>Standard price</div>
                                    </div>
                                    <strong style={{ fontSize: '16px' }}>€65,00</strong>
                                </div>
                            </div>
                            <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '12px', position: 'relative', marginBottom: '8px', background: '#ffffff' }}>
                                <div style={{ position: 'absolute', top: '-8px', right: '12px', background: '#000', color: '#fff', padding: '2px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 600 }}>
                                    MOST POPULAR
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        type="radio"
                                        checked
                                        readOnly
                                        style={{
                                            width: '16px',
                                            height: '16px'
                                        }}
                                    />                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <strong style={{ fontSize: '14px' }}>2 pack</strong>
                                            <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 15%</span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6d7175' }}>You save €10,05</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <strong style={{ fontSize: '16px' }}>€56,95</strong>
                                        <div style={{ fontSize: '12px', color: '#6d7175', textDecoration: 'line-through' }}>€67,00</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '11px', color: '#2b2b2b', borderTop: '1px solid #e0e0e0', paddingTop: '8px' }}>
                                    FetchLink C10 GPS Wireless Dog Fence with 2K Camera - ciwi
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <button style={{ marginTop: '8px', background: '#000', color: '#fff', padding: '4px 12px', borderRadius: '4px', border: 'none', fontSize: '11px', cursor: 'pointer' }}>
                                        Choose
                                    </button>
                                </div>
                            </div>
                            <div style={{ marginTop: 'auto' }}>
                                <strong style={{ fontSize: '13px' }}>Quantity breaks for different products</strong>
                            </div>
                        </>
                    )}

                    {basicInformation.offerType?.subtype === 'complete-bundle' && (
                        <>
                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <input
                                        type="radio"
                                        checked
                                        readOnly
                                        style={{
                                            width: '16px',
                                            height: '16px'
                                        }}
                                    />                                    <div style={{ flex: 1 }}>
                                        <strong style={{ fontSize: '13px' }}>FetchLink C10 GPS</strong>
                                        <div style={{ fontSize: '11px', color: '#6d7175' }}>Standard price</div>
                                    </div>
                                    <strong style={{ fontSize: '14px' }}>€65,00</strong>
                                </div>
                            </div>
                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px', marginBottom: '10px', opacity: 0.6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        type="radio"
                                        disabled
                                        readOnly
                                        style={{
                                            width: '16px',
                                            height: '16px'
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <strong style={{ fontSize: '13px', color: '#6d7175' }}>Complete the bundle</strong>
                                        <div style={{ fontSize: '11px', color: '#6d7175' }}>Save €14,50!</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <strong style={{ fontSize: '14px', color: '#6d7175' }}>€60,00</strong>
                                        <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€74,50</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                                        <div style={{ fontSize: '10px', color: '#6d7175', marginBottom: '4px' }}>FetchLink</div>
                                        <div style={{ fontSize: '11px' }}>€52,00</div>
                                    </div>
                                    <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                                        <div style={{ fontSize: '10px', color: '#6d7175', marginBottom: '4px' }}>Bosch</div>
                                        <div style={{ fontSize: '11px' }}>€8,00</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: 'auto', marginBottom: '8px' }}>
                                <strong style={{ fontSize: '13px' }}>Complete the bundle</strong>
                            </div>
                        </>
                    )}

                    {basicInformation.offerType?.subtype === 'subscription' && (
                        <>
                            <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="radio"
                                    checked
                                    readOnly
                                    style={{
                                        width: '16px',
                                        height: '16px'
                                    }}
                                />                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <strong style={{ fontSize: '13px' }}>Buy 1, get 1 free</strong>
                                        <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 50%</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong style={{ fontSize: '14px' }}>€65,00</strong>
                                    <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€130,00</div>
                                </div>
                            </div>
                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="radio"
                                    checked={false}
                                    readOnly
                                    style={{
                                        width: 16,
                                        height: 16,
                                        pointerEvents: 'none', // 关键
                                    }}
                                />                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <strong style={{ fontSize: '13px' }}>Buy 2, get 3 free</strong>
                                        <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 60%</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong style={{ fontSize: '14px' }}>€130,00</strong>
                                    <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€325,00</div>
                                </div>
                            </div>
                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="radio"
                                    checked={false}
                                    readOnly
                                    style={{
                                        width: 16,
                                        height: 16,
                                        pointerEvents: 'none', // 关键
                                    }}
                                />                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <strong style={{ fontSize: '13px' }}>Buy 3, get 6 free</strong>
                                        <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 67%</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong style={{ fontSize: '14px' }}>€195,00</strong>
                                    <div style={{ fontSize: '11px', color: '#6d7175', textDecoration: 'line-through' }}>€585,00</div>
                                </div>
                            </div>
                            <div style={{ background: '#e0e0e0', padding: '8px 12px', borderRadius: '6px', textAlign: 'center', fontSize: '12px', marginBottom: '8px' }}>
                                + FREE special gift!
                            </div>
                            <div style={{ border: '1px dashed #000', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    defaultChecked={false}
                                    readOnly
                                    style={{
                                        width: '16px',
                                        height: '16px'
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <strong style={{ fontSize: '12px' }}>Subscribe & Save 20%</strong>
                                    <div style={{ fontSize: '10px', color: '#6d7175' }}>Delivered weekly</div>
                                </div>
                            </div>
                            <div style={{ marginTop: 'auto', marginBottom: '6px' }}>
                                <strong style={{ fontSize: '13px' }}>Subscription</strong>
                            </div>
                        </>
                    )}

                    {basicInformation.offerType?.subtype === 'progressive-gifts' && (
                        <>
                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: '#f9fafb' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="radio"
                                        checked={false}
                                        readOnly
                                        style={{
                                            width: 16,
                                            height: 16,
                                            pointerEvents: 'none', // 关键
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <strong style={{ fontSize: '14px' }}>1 pack</strong>
                                    </div>
                                    <strong style={{ fontSize: '16px' }}>€65,00</strong>
                                </div>
                            </div>
                            <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: '#ffffff' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="radio"
                                        checked
                                        readOnly
                                        style={{
                                            width: '16px',
                                            height: '16px'
                                        }}
                                    />                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <strong style={{ fontSize: '14px' }}>2 pack</strong>
                                            <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 15%</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <strong style={{ fontSize: '16px' }}>€110,50</strong>
                                        <div style={{ fontSize: '12px', color: '#6d7175', textDecoration: 'line-through' }}>€130,00</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="radio"
                                        checked={false}
                                        readOnly
                                        style={{
                                            width: 16,
                                            height: 16,
                                            pointerEvents: 'none', // 关键
                                        }}
                                    />                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <strong style={{ fontSize: '14px' }}>3 pack</strong>
                                            <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>SAVE 15%</span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <strong style={{ fontSize: '16px' }}>€165,75</strong>
                                        <div style={{ fontSize: '12px', color: '#6d7175', textDecoration: 'line-through' }}>€195,00</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ background: '#fff8e6', border: '1px solid #ffd700', borderRadius: '8px', padding: '8px', marginBottom: '6px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>🎁 Unlock Free gifts</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: '6px', padding: '6px', textAlign: 'center', background: '#fff' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>FREE</div>
                                        <div style={{ fontSize: '16px' }}>🚚</div>
                                        <div style={{ fontSize: '9px', color: '#6d7175' }}>Free shipping</div>
                                    </div>
                                    <div style={{ flex: 1, border: '1px solid #e0e0e0', borderRadius: '6px', padding: '6px', textAlign: 'center', background: '#f5f5f5', opacity: 0.5 }}>
                                        <div style={{ fontSize: '16px' }}>🔒</div>
                                        <div style={{ fontSize: '9px', color: '#6d7175' }}>Locked</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: 'auto', marginBottom: '6px' }}>
                                <strong style={{ fontSize: '13px' }}>Progressive gifts</strong>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BasicInformationSetting;