import { useNavigate } from "@remix-run/react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy, Trash2, X } from "lucide-react";
import { useState } from "react";


const Index = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [offerType, setOfferType] = useState('quantity-breaks-same');
    const [productSelection, setProductSelection] = useState('specific-selected');
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
    const [discountRules, setDiscountRules] = useState([
        {
            id: 1,
            isExpanded: true,
            title: 'Buy 1, get 1 free',
            buyQty: 1,
            getQty: 1,
            priceType: 'default',
            subtitle: '',
            badgeText: '',
            badgeStyle: 'simple',
            label: 'SAVE {{saved_percentage}}',
            selectedByDefault: true,
            showAsSoldOut: false
        }
    ]);

    const steps = [
        'Basic Information',
        'Products & Discounts',
        'Style Design',
        'Schedule & Budget'
    ];

    const offerTypes = [
        {
            id: 'quantity-breaks-same',
            name: 'Quantity breaks for the same product',
            description: 'Offer discounts when customers buy multiple quantities of the same product'
        },
        {
            id: 'bogo',
            name: 'Buy X, get Y free (BOGO) deal',
            description: 'Create buy-one-get-one or buy-X-get-Y-free promotions'
        },
        {
            id: 'quantity-breaks-different',
            name: 'Quantity breaks for different products',
            description: 'Offer discounts when customers buy multiple different products together'
        },
        {
            id: 'complete-bundle',
            name: 'Complete the bundle',
            description: 'Encourage customers to complete a bundle by adding recommended products'
        },
        {
            id: 'subscription',
            name: 'Subscription',
            description: 'Offer recurring subscription discounts for regular deliveries'
        },
        {
            id: 'progressive-gifts',
            name: 'Progressive gifts',
            description: 'Unlock free gifts as customers add more items to their cart'
        }
    ];

    return (
        <div className="polaris-page">
            <div className="polaris-page__header">
                <div>
                    <button className="polaris-button polaris-button--plain" onClick={() => navigate('/app/offers')}>
                        ← Back
                    </button>
                    <h1 className="polaris-page__title">Create New Offer</h1>
                </div>
            </div>

            <div className="polaris-card" style={{ marginBottom: '80px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '24px' }} className="sm:flex sm:gap-[12px]">
                    {steps.map((stepName, index) => (
                        <div
                            key={index}
                            style={{
                                flex: 1,
                                padding: '10px 8px',
                                background: step === index + 1 ? '#008060' : '#f4f6f8',
                                color: step === index + 1 ? 'white' : '#6d7175',
                                borderRadius: '6px',
                                textAlign: 'center',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                            className="sm:text-[14px] sm:p-[12px]"
                            onClick={() => setStep(index + 1)}
                        >
                            <span className="hidden sm:inline">{index + 1}. </span>{stepName}
                        </div>
                    ))}
                </div>

                <div className="polaris-layout">
                    {step === 1 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }} className="lg:grid-cols-[1fr_400px]">
                            {/* Left Column - Form */}
                            <div>
                                <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Basic Information</h2>
                                <div className="polaris-stack polaris-stack--vertical">
                                    <label style={{ fontSize: '14px', fontWeight: 500 }}>
                                        Offer Name
                                        <input
                                            type="text"
                                            placeholder="e.g., Summer Bundle Deal"
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

                                    <label style={{ fontSize: '14px', fontWeight: 500, marginTop: '16px' }}>
                                        Offer Type
                                        <select
                                            value={offerType}
                                            onChange={(e) => setOfferType(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                marginTop: '8px',
                                                border: '1px solid #dfe3e8',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {offerTypes.map(type => (
                                                <option key={type.id} value={type.id}>
                                                    {type.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            </div>

                            {/* Right Column - Preview */}
                            <div style={{ position: 'sticky', top: '24px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Preview</h3>
                                <p className="polaris-text-subdued" style={{ fontSize: '13px', marginBottom: '12px' }}>
                                    {offerTypes.find(type => type.id === offerType)?.description}
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
                                    {offerType === 'quantity-breaks-same' && (
                                        <>
                                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '12px', background: '#f9fafb' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
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
                                                    <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
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

                                    {offerType === 'bogo' && (
                                        <>
                                            <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
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
                                                <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                                                <div style={{ flex: 1 }}>
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
                                                <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                                                <div style={{ flex: 1 }}>
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

                                    {offerType === 'quantity-breaks-different' && (
                                        <>
                                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: '#f9fafb' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                                                    <div style={{ flex: 1 }}>
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
                                                    <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
                                                    <div style={{ flex: 1 }}>
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

                                    {offerType === 'complete-bundle' && (
                                        <>
                                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                                                    <div style={{ flex: 1 }}>
                                                        <strong style={{ fontSize: '13px' }}>FetchLink C10 GPS</strong>
                                                        <div style={{ fontSize: '11px', color: '#6d7175' }}>Standard price</div>
                                                    </div>
                                                    <strong style={{ fontSize: '14px' }}>€65,00</strong>
                                                </div>
                                            </div>
                                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '10px', marginBottom: '10px', opacity: 0.6 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                    <input type="radio" readOnly disabled style={{ width: '16px', height: '16px' }} />
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

                                    {offerType === 'subscription' && (
                                        <>
                                            <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
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
                                                <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                                                <div style={{ flex: 1 }}>
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
                                                <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                                                <div style={{ flex: 1 }}>
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
                                                <input type="checkbox" readOnly style={{ width: '16px', height: '16px' }} />
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

                                    {offerType === 'progressive-gifts' && (
                                        <>
                                            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: '#f9fafb' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                                                    <div style={{ flex: 1 }}>
                                                        <strong style={{ fontSize: '14px' }}>1 pack</strong>
                                                    </div>
                                                    <strong style={{ fontSize: '16px' }}>€65,00</strong>
                                                </div>
                                            </div>
                                            <div style={{ border: '2px solid #000', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: '#ffffff' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
                                                    <div style={{ flex: 1 }}>
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
                                                    <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                                                    <div style={{ flex: 1 }}>
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
                    )}

                    {step === 2 && (
                        <>
                            {/* Product Modal */}
                            {showProductModal && (
                                <div style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1000
                                }}>
                                    <div style={{
                                        background: '#fff',
                                        borderRadius: '12px',
                                        width: '90%',
                                        maxWidth: '800px',
                                        maxHeight: '90vh',
                                        overflow: 'auto',
                                        padding: '24px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Select Products</h2>
                                            <button onClick={() => setShowProductModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                                <X size={24} />
                                            </button>
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Search products..."
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                border: '1px solid #dfe3e8',
                                                borderRadius: '6px',
                                                marginBottom: '16px',
                                                fontSize: '14px'
                                            }}
                                        />

                                        {/* Mock product list */}
                                        <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                                            {[
                                                { id: 1, name: 'Product A', price: '€65.00', image: 'https://via.placeholder.com/60' },
                                                { id: 2, name: 'Product B', price: '€75.00', image: 'https://via.placeholder.com/60' },
                                                { id: 3, name: 'Product C', price: '€85.00', image: 'https://via.placeholder.com/60' }
                                            ].map(product => (
                                                <div key={product.id} style={{
                                                    display: 'flex',
                                                    gap: '12px',
                                                    padding: '12px',
                                                    border: '1px solid #dfe3e8',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer'
                                                }}
                                                    onClick={() => {
                                                        if (!selectedProducts.find(p => p.id === product.id)) {
                                                            setSelectedProducts([...selectedProducts, product]);
                                                        }
                                                    }}
                                                >
                                                    <img src={product.image} alt={product.name} style={{ width: '60px', height: '60px', borderRadius: '6px' }} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 500 }}>{product.name}</div>
                                                        <div style={{ color: '#6d7175', fontSize: '14px' }}>{product.price}</div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProducts.some(p => p.id === product.id)}
                                                        readOnly
                                                        style={{ width: '20px', height: '20px' }}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => setShowProductModal(false)}
                                            style={{
                                                width: '100%',
                                                background: '#2b2b2b',
                                                color: '#fff',
                                                padding: '12px',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 500
                                            }}
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
                                {/* Left Column - Form */}
                                <div>
                                    <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Products & Discounts</h2>

                                    {/* Product Selection Section */}
                                    <div style={{ marginBottom: '32px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Products eligible for offer</h3>

                                        {selectedProducts.length === 0 ? (
                                            <button
                                                onClick={() => setShowProductModal(true)}
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
                                                    onClick={() => setShowProductModal(true)}
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
                                            <div key={rule.id} style={{
                                                border: '1px solid #dfe3e8',
                                                borderRadius: '8px',
                                                marginBottom: '16px',
                                                overflow: 'hidden'
                                            }}>
                                                {/* Rule Header */}
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

                                                {/* Rule Content */}
                                                {rule.isExpanded && (
                                                    <div style={{ padding: '16px' }}>
                                                        {/* Buy/Get quantities */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                                            <div>
                                                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                                                                    Quantity
                                                                </label>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Buy</span>
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
                                                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                                                                    Quantity
                                                                </label>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>, get</span>
                                                                    <input
                                                                        type="number"
                                                                        value={rule.getQty}
                                                                        onChange={(e) => {
                                                                            const newRules = [...discountRules];
                                                                            newRules[index].getQty = parseInt(e.target.value) || 0;
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
                                                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>free!</span>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px', color: '#a0a0a0' }}>
                                                                    Price
                                                                </label>
                                                                <select
                                                                    value={rule.priceType}
                                                                    onChange={(e) => {
                                                                        const newRules = [...discountRules];
                                                                        newRules[index].priceType = e.target.value;
                                                                        setDiscountRules(newRules);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '8px 12px',
                                                                        border: '1px solid #dfe3e8',
                                                                        borderRadius: '6px',
                                                                        fontSize: '14px',
                                                                        color: '#a0a0a0'
                                                                    }}
                                                                >
                                                                    <option value="default">Default</option>
                                                                    <option value="custom">Custom</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Title and Subtitle */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                                            <div>
                                                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                                                    Title
                                                                    <span style={{ fontSize: '12px', color: '#6d7175' }}>{'{}'}</span>
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
                                                                    <span style={{ fontSize: '12px', color: '#6d7175' }}>{'{}'}</span>
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

                                                        {/* Badge text and style */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                                            <div>
                                                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                                                    Badge text
                                                                    <span style={{ fontSize: '12px', color: '#6d7175' }}>{'{}'}</span>
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

                                                            <div>
                                                                <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                                                    Badge style
                                                                    <span style={{ fontSize: '12px', color: '#6d7175' }}>{'{}'}</span>
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
                                                            </div>
                                                        </div>

                                                        {/* Label */}
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <label style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                                                Label
                                                                <span style={{ fontSize: '12px', color: '#6d7175' }}>{'{}'}</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={rule.label}
                                                                onChange={(e) => {
                                                                    const newRules = [...discountRules];
                                                                    newRules[index].label = e.target.value;
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

                                                        {/* Selected by default */}
                                                        <div style={{ marginBottom: '16px' }}>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={rule.selectedByDefault}
                                                                    onChange={(e) => {
                                                                        const newRules = [...discountRules];
                                                                        newRules[index].selectedByDefault = e.target.checked;
                                                                        setDiscountRules(newRules);
                                                                    }}
                                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                                />
                                                                <span style={{ fontSize: '14px' }}>Selected by default</span>
                                                            </label>
                                                        </div>

                                                        {/* Action buttons */}
                                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                                            <button style={{
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
                                                                gap: '6px'
                                                            }}>
                                                                🖼️ Add image
                                                            </button>
                                                            <button style={{
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
                                                                gap: '6px'
                                                            }}>
                                                                📈 Add upsell
                                                            </button>
                                                            <button style={{
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
                                                                gap: '6px'
                                                            }}>
                                                                🎁 Add free gift
                                                            </button>
                                                        </div>

                                                        {/* Show as Sold out toggle */}
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            paddingTop: '16px',
                                                            borderTop: '1px solid #dfe3e8'
                                                        }}>
                                                            <span style={{ fontSize: '14px' }}>Show as Sold out</span>
                                                            <label style={{
                                                                position: 'relative',
                                                                display: 'inline-block',
                                                                width: '48px',
                                                                height: '24px',
                                                                cursor: 'pointer'
                                                            }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={rule.showAsSoldOut}
                                                                    onChange={(e) => {
                                                                        const newRules = [...discountRules];
                                                                        newRules[index].showAsSoldOut = e.target.checked;
                                                                        setDiscountRules(newRules);
                                                                    }}
                                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                                />
                                                                <span style={{
                                                                    position: 'absolute',
                                                                    cursor: 'pointer',
                                                                    top: 0,
                                                                    left: 0,
                                                                    right: 0,
                                                                    bottom: 0,
                                                                    background: rule.showAsSoldOut ? '#008060' : '#dfe3e8',
                                                                    borderRadius: '24px',
                                                                    transition: '0.3s'
                                                                }}>
                                                                    <span style={{
                                                                        position: 'absolute',
                                                                        content: '',
                                                                        height: '18px',
                                                                        width: '18px',
                                                                        left: rule.showAsSoldOut ? '26px' : '3px',
                                                                        bottom: '3px',
                                                                        background: 'white',
                                                                        borderRadius: '50%',
                                                                        transition: '0.3s'
                                                                    }} />
                                                                </span>
                                                            </label>
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
                                                    title: `Buy ${discountRules.length + 1}, get ${discountRules.length + 1} free`,
                                                    buyQty: discountRules.length + 1,
                                                    getQty: discountRules.length + 1,
                                                    priceType: 'default',
                                                    subtitle: '',
                                                    badgeText: '',
                                                    badgeStyle: 'simple',
                                                    label: 'SAVE {{saved_percentage}}',
                                                    selectedByDefault: false,
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
                                        {offerTypes.find(type => type.id === offerType)?.description}
                                    </p>

                                    {/* Preview Card - Same as Step 1 */}
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
                                        {offerType === 'quantity-breaks-same' && (
                                            <>
                                                <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '12px', background: '#f9fafb' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
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
                                                        <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
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
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 3 && (
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
                                        <div style={{
                                            border: '2px solid #dfe3e8',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}>
                                            <div style={{ fontWeight: 500, marginBottom: '4px' }}>Vertical Stack</div>
                                            <div style={{ fontSize: '12px', color: '#6d7175' }}>Products stacked vertically</div>
                                        </div>
                                        <div style={{
                                            border: '2px solid #dfe3e8',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}>
                                            <div style={{ fontWeight: 500, marginBottom: '4px' }}>Horizontal Grid</div>
                                            <div style={{ fontSize: '12px', color: '#6d7175' }}>Products in a row</div>
                                        </div>
                                        <div style={{
                                            border: '2px solid #dfe3e8',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}>
                                            <div style={{ fontWeight: 500, marginBottom: '4px' }}>Card Grid</div>
                                            <div style={{ fontSize: '12px', color: '#6d7175' }}>2x2 grid layout</div>
                                        </div>
                                        <div style={{
                                            border: '2px solid #dfe3e8',
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
                                                defaultValue="#ffffff"
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
                                                defaultValue="#008060"
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
                                        </label>
                                        <label style={{ fontSize: '14px', fontWeight: 500 }}>
                                            Border Color
                                            <input
                                                type="color"
                                                defaultValue="#dfe3e8"
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
                                                defaultValue="Bundle & Save"
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
                                                defaultValue="16"
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    marginTop: '8px',
                                                    border: '1px solid #dfe3e8',
                                                    borderRadius: '6px',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                <option value="12">12px</option>
                                                <option value="14">14px</option>
                                                <option value="16">16px</option>
                                                <option value="18">18px</option>
                                                <option value="20">20px</option>
                                                <option value="24">24px</option>
                                                <option value="28">28px</option>
                                            </select>
                                        </label>
                                        <label style={{ fontSize: '14px', fontWeight: 500 }}>
                                            Font Style
                                            <select
                                                defaultValue="bold"
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
                                                <option value="600">Semi Bold</option>
                                                <option value="300">Light</option>
                                            </select>
                                        </label>
                                        <label style={{ fontSize: '14px', fontWeight: 500 }}>
                                            Title Color
                                            <input
                                                type="color"
                                                defaultValue="#202223"
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
                                                defaultValue="#008060"
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
                                                defaultValue="Add to Cart"
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

                                    <div style={{
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
                                    </div>

                                    <div style={{
                                        border: '1px solid #dfe3e8',
                                        borderRadius: '8px',
                                        padding: '16px'
                                    }}>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                defaultChecked={false}
                                                style={{ marginRight: '8px', width: '16px', height: '16px' }}
                                            />
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Enable Countdown Timer</span>
                                        </label>
                                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                                            Add urgency with a countdown timer
                                        </p>

                                        <div style={{ marginTop: '12px', marginLeft: '24px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: 500 }}>
                                                Timer Duration
                                                <select
                                                    defaultValue="24"
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

                                            <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginTop: '12px' }}>
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
                                            </label>

                                            <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginTop: '12px' }}>
                                                Timer Color
                                                <input
                                                    type="color"
                                                    defaultValue="#d82c0d"
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
                                    borderRadius: '12px',
                                    padding: '20px',
                                    background: '#ffffff'
                                }}>
                                    {/* Card Title */}
                                    <h3 style={{
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        color: '#202223',
                                        marginBottom: '16px'
                                    }}>
                                        Bundle & Save
                                    </h3>

                                    {/* Countdown Timer (when enabled) */}
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
                                        <div style={{
                                            fontSize: '18px',
                                            fontWeight: 600,
                                            color: '#d82c0d',
                                            fontFamily: 'monospace'
                                        }}>
                                            23:45:12
                                        </div>
                                    </div>

                                    {/* Product Items */}
                                    <div style={{
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        marginBottom: '10px',
                                        background: '#f9fafb'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input type="radio" readOnly style={{ width: '16px', height: '16px' }} />
                                            <div style={{ flex: 1 }}>
                                                <strong style={{ fontSize: '13px' }}>Single Item</strong>
                                                <div style={{ fontSize: '11px', color: '#6d7175' }}>Standard price</div>
                                            </div>
                                            <strong style={{ fontSize: '14px' }}>€65,00</strong>
                                        </div>
                                    </div>

                                    <div style={{
                                        border: '2px solid #008060',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        position: 'relative',
                                        background: '#ffffff',
                                        marginBottom: '10px'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            right: '12px',
                                            background: '#008060',
                                            color: '#fff',
                                            padding: '2px 10px',
                                            borderRadius: '12px',
                                            fontSize: '10px',
                                            fontWeight: 600
                                        }}>
                                            BEST VALUE
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input type="radio" readOnly checked style={{ width: '16px', height: '16px' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <strong style={{ fontSize: '13px' }}>Bundle Deal</strong>
                                                    <span style={{
                                                        background: '#008060',
                                                        color: '#fff',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        fontWeight: 600
                                                    }}>
                                                        SAVE 20%
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#6d7175' }}>You save €26,00</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <strong style={{ fontSize: '14px' }}>€104,00</strong>
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: '#6d7175',
                                                    textDecoration: 'line-through'
                                                }}>
                                                    €130,00
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Add to Cart Button */}
                                    <button style={{
                                        width: '100%',
                                        background: '#008060',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '12px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        marginTop: '12px'
                                    }}>
                                        Add to Cart
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
                    )}

                    {step === 4 && (
                        <div>
                            <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Targeting & Settings</h2>

                            {/* Target Audience */}
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Target Audience</h3>
                                <div className="polaris-stack polaris-stack--vertical">
                                    <label style={{ fontSize: '14px', fontWeight: 500 }}>
                                        Customer Segments
                                        <div style={{
                                            marginTop: '8px',
                                            border: '1px solid #dfe3e8',
                                            borderRadius: '6px',
                                            padding: '12px',
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: '12px'
                                        }}>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" defaultChecked style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>All Customers</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>VIP Customers</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>New Customers</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>Returning Customers</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>High-Value Customers</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>At-Risk Customers</span>
                                            </label>
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                                            Select one or more customer segments to target
                                        </p>
                                    </label>

                                    <label style={{ fontSize: '14px', fontWeight: 500, marginTop: '16px' }}>
                                        Market Visibility
                                        <div style={{
                                            marginTop: '8px',
                                            border: '1px solid #dfe3e8',
                                            borderRadius: '6px',
                                            padding: '12px',
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: '12px'
                                        }}>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" defaultChecked style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>All Markets</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>United States</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>Europe</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>United Kingdom</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>Canada</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>Australia</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                                <input type="checkbox" style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                                <span style={{ fontSize: '14px' }}>Asia Pacific</span>
                                            </label>
                                        </div>
                                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                                            Select which markets can see this offer
                                        </p>
                                    </label>
                                </div>
                            </div>

                            {/* Schedule */}
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Schedule</h3>
                                <div className="polaris-grid">
                                    <label style={{ fontSize: '14px', fontWeight: 500 }}>
                                        Start Time
                                        <input
                                            type="datetime-local"
                                            step="1"
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                marginTop: '8px',
                                                border: '1px solid #dfe3e8',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                                            When the offer becomes active
                                        </p>
                                    </label>
                                    <label style={{ fontSize: '14px', fontWeight: 500 }}>
                                        End Time
                                        <input
                                            type="datetime-local"
                                            step="1"
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                marginTop: '8px',
                                                border: '1px solid #dfe3e8',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                                            When the offer expires
                                        </p>
                                    </label>
                                </div>
                            </div>

                            {/* Budget */}
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Budget</h3>
                                <div className="polaris-grid">
                                    <label style={{ fontSize: '14px', fontWeight: 500 }}>
                                        Total Budget (Optional)
                                        <input
                                            type="number"
                                            placeholder="$0.00"
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                marginTop: '8px',
                                                border: '1px solid #dfe3e8',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                                            Maximum total spend for this offer
                                        </p>
                                    </label>
                                    <label style={{ fontSize: '14px', fontWeight: 500 }}>
                                        Daily Budget (Optional)
                                        <input
                                            type="number"
                                            placeholder="$0.00"
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                marginTop: '8px',
                                                border: '1px solid #dfe3e8',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        />
                                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                                            Maximum spend per day
                                        </p>
                                    </label>
                                </div>
                            </div>

                            {/* Risk Control */}
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Risk Control</h3>
                                <div className="polaris-stack polaris-stack--vertical">
                                    <label style={{ fontSize: '14px', fontWeight: 500 }}>
                                        Usage Limit Per Customer
                                        <select
                                            defaultValue="unlimited"
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                marginTop: '8px',
                                                border: '1px solid #dfe3e8',
                                                borderRadius: '6px',
                                                fontSize: '14px'
                                            }}
                                        >
                                            <option value="unlimited">Unlimited</option>
                                            <option value="1">1 time only</option>
                                            <option value="2">2 times</option>
                                            <option value="3">3 times</option>
                                            <option value="5">5 times</option>
                                            <option value="10">10 times</option>
                                            <option value="custom">Custom...</option>
                                        </select>
                                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                                            How many times each customer can use this offer
                                        </p>
                                    </label>

                                    <div style={{
                                        marginTop: '16px',
                                        border: '1px solid #dfe3e8',
                                        borderRadius: '8px',
                                        padding: '16px'
                                    }}>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                defaultChecked={true}
                                                style={{ marginRight: '8px', width: '16px', height: '16px' }}
                                            />
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Hide offer after expiration</span>
                                        </label>
                                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                                            Don't display the offer widget after the end date
                                        </p>
                                    </div>

                                    <div style={{
                                        marginTop: '16px',
                                        border: '1px solid #dfe3e8',
                                        borderRadius: '8px',
                                        padding: '16px'
                                    }}>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                defaultChecked={false}
                                                style={{ marginRight: '8px', width: '16px', height: '16px' }}
                                            />
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Show offer to bots/crawlers</span>
                                        </label>
                                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                                            Display offer information to search engine crawlers and bots
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Fixed Bottom Action Bar */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: '#ffffff',
                borderTop: '1px solid #dfe3e8',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                zIndex: 100,
                boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)'
            }}>
                {step > 1 && (
                    <button
                        className="polaris-button polaris-button--plain"
                        onClick={() => setStep(step - 1)}
                    >
                        Previous
                    </button>
                )}
                <button
                    className="polaris-button"
                    onClick={() => step < 4 ? setStep(step + 1) : navigate('/offers', { state: { showPublishGuide: true } })}
                >
                    {step === 4 ? 'Create Offer' : 'Next'}
                </button>
            </div>
        </div>
    );
};

export default Index;