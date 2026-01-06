import { ActionFunctionArgs } from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";
import { Typography, Button, Checkbox, CheckboxProps, Col, Divider, Flex, Input, InputNumber, Radio, Row, Select, Space, Statistic, DatePicker } from 'antd';
import { mutationDiscountAutomaticAppCreate, queryCustomers, queryMarkets, queryProductVariants, querySegments } from "app/api/admin";
import { authenticate } from "app/shopify.server";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from 'dayjs';

const { Timer } = Statistic;
const { Text } = Typography

type OfferType =
    | "quantity-breaks-same"
    | "bogo"
    | "quantity-breaks-different"
    | "complete-bundle"
    | "subscription"
    | "progressive-gifts";

interface productModalDataType {
    id: string;
    name: string;
    price: string;
    image: string
}

interface WholeHouseRentalDiscountRuleType {
    id: number;
    isExpanded: boolean;
    title: string;
    buyQty: number;
    discountRate: number;
    subtitle: string;
    labelText: string;
    badgeText: string;
    selectedByDefault: boolean;
    upsellProducts: {
        id: number;
        variantid: string;
        upsellText: string;
        discountType: "default" | "percentage" | "amount" | "specific";
        discountValue: {
            percentage: number;
            amount: number;
            specific: number;
        }
        selectedByDefault: boolean;
        visibleWithoutCheck: boolean;
    }[];
    freegiftProducts: {
        id: number;
        variantid: string;
        freegiftText: string;
        showOriginalPrice: boolean;
    }[];
    showAsSoldOut: boolean;
}

interface RangeDiscountsType {
    typename: "RangeDiscountsType";
    ranges: {
        min: number; // 最小件数（包含）
        max?: number; // 最大件数（包含），不填表示无限
        discountRate: number;
    }[];
    calculateQuantityWithVariantsArray?: string[];
}

interface WholeHouseRentalDiscountType {
    typename: "WholeHouseRentalDiscountType";
    groupSize: number; //折扣组的元素数量
    groupDiscount: number; //满一组的折扣（如 0.5 表示 50%）
    remainder: any; //不满一组的各种情况的折扣，key 为数量，value 为折扣系数
    calculateQuantityWithVariantsArray?: string[]; //一起计算quantity的变体数据数组
}

interface BundleDiscountType {
    typename: "BundleDiscountType";
    bundleItems: {
        variantId: string;
        quantity: number;
        discountRate: number;
    }[];
}

interface BasicInformationType {
    offerName: string;
    offerType: string;
}

interface StyleConfigType {
    base_style: "vertical_stack" | "horizontal_grid" | "card_grid" | "compact_list";
    card_background_color: string;
    card_label_color: string;
    card_border_color: string;
    card_title_text: string;
    card_title_text_fontSize: string;
    card_title_text_fontStyle: "bold" | "normal" | "300";
    card_title_color: string;
    card_button_text: string;
    card_button_primaryColor: string;
    enable_countdown_timer: boolean;
    countdown_timer_config: {
        timer_duration: number;
        // timer_style: "minimal" | "modern" | "compact";
        timer_color: string;
    };
}

interface TargetingSettingsType {
    eligibilityType: "all" | "segments" | "customers";
    eligibilityRadioData: any;
    marketVisibilitySettingData: string[];
    startTime: Date | null;
    endTime: Date | null;
    totalBudget: number | null;
    dailyBudget: number | null;
    timesLimitForPercustomer: number | null;
    hideOfferAfterExpiration: boolean;
    showOfferToBots: boolean;
}

export const action = async ({ request }: ActionFunctionArgs) => {
    const adminAuthResult = await authenticate.admin(request);
    const { shop, accessToken } = adminAuthResult.session;

    const formData = await request.formData();

    const productVariantRequestBody = JSON.parse(
        formData.get("productVariantRequestBody") as string,
    );
    const customerSegmentsRequestBody = JSON.parse(
        formData.get("customerSegmentsRequestBody") as string,
    );
    const customersRequestBody = JSON.parse(
        formData.get("customersRequestBody") as string,
    );
    const shopMarketsRequestBody = JSON.parse(
        formData.get("shopMarketsRequestBody") as string,
    );
    const discountAutomaticAppCreateRequestBody = JSON.parse(
        formData.get("discountAutomaticAppCreateRequestBody") as string,
    );

    switch (true) {
        case !!productVariantRequestBody:
            try {
                const productVariantData = await queryProductVariants({
                    ...productVariantRequestBody,
                    shop,
                    accessToken,
                });

                if (productVariantData) {
                    return {
                        success: true,
                        errorCode: 0,
                        errorMsg: "",
                        response: productVariantData,
                    }
                }

                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            } catch (error) {
                console.error(`${shop} productVariantRequestBody Error: `, error);
                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            }
        case !!customerSegmentsRequestBody:
            try {
                const customerSegmentsData = await querySegments({
                    ...customerSegmentsRequestBody,
                    shop,
                    accessToken,
                });

                if (customerSegmentsData) {
                    return {
                        success: true,
                        errorCode: 0,
                        errorMsg: "",
                        response: customerSegmentsData,
                    }
                }

                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            } catch (error) {
                console.error(`${shop} customerSegmentsRequestBody Error: `, error);
                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            }
        case !!customersRequestBody:
            try {
                const customersData = await queryCustomers({
                    ...customersRequestBody,
                    shop,
                    accessToken,
                });

                if (customersData) {
                    return {
                        success: true,
                        errorCode: 0,
                        errorMsg: "",
                        response: customersData,
                    }
                }

                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            } catch (error) {
                console.error(`${shop} customersRequestBody Error: `, error);
                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            }
        case !!shopMarketsRequestBody:
            try {
                const shopMarketsData = await queryMarkets({
                    ...shopMarketsRequestBody,
                    shop,
                    accessToken,
                });

                if (shopMarketsData) {
                    return {
                        success: true,
                        errorCode: 0,
                        errorMsg: "",
                        response: shopMarketsData,
                    }
                }

                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            } catch (error) {
                console.error(`${shop} shopMarketsRequestBody Error: `, error);
                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            }
        case !!discountAutomaticAppCreateRequestBody:
            try {
                const discountAutomaticAppCreateData = await mutationDiscountAutomaticAppCreate({
                    shop,
                    accessToken: accessToken || "",
                    variables: discountAutomaticAppCreateRequestBody,
                });

                if (discountAutomaticAppCreateData) {
                    return {
                        success: true,
                        errorCode: 0,
                        errorMsg: "",
                        response: discountAutomaticAppCreateData,
                    }
                }

                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            } catch (error) {
                console.error(`${shop} shopMarketsRequestBody Error: `, error);
                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            }

        default:
            console.error(`${shop} Request with unrecognized key: `, formData);
            return {
                success: false,
                errorCode: 10001,
                errorMsg: "SERVER_ERROR",
                response: null,
            }
    }
};

const Index = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();


    const steps = [
        t('Basic Information'),
        t('Products & Discounts'),
        t('Style Design'),
        t('Schedule & Budget')
    ];

    const offerTypes: {
        id: string;
        name: string;
        description: string;
        defaultRules?: RangeDiscountsType | WholeHouseRentalDiscountType | BundleDiscountType;
    }[] = [
            {
                id: 'quantity-breaks-same',
                name: t('Quantity breaks for the same product'),
                description: t('Offer discounts when customers buy multiple quantities of the same product'),
                defaultRules: {
                    typename: "RangeDiscountsType",
                    ranges: [
                        {
                            min: 1,
                            max: 3,
                            discountRate: 0.9
                        },
                        {
                            min: 4,
                            max: 6,
                            discountRate: 0.8
                        },
                        {
                            min: 7,
                            max: 9,
                            discountRate: 0.6
                        }
                    ]
                }
            },
            {
                id: 'bogo',
                name: t('Buy X, get Y free (BOGO) deal'),
                description: t('Create buy-one-get-one or buy-X-get-Y-free promotions')
            },
            {
                id: 'quantity-breaks-different',
                name: t('Quantity breaks for different products'),
                description: t('Offer discounts when customers buy multiple different products together')
            },
            {
                id: 'complete-bundle',
                name: t('Complete the bundle'),
                description: t('Encourage customers to complete a bundle by adding recommended products')
            },
            {
                id: 'subscription',
                name: t('Subscription'),
                description: t('Offer recurring subscription discounts for regular deliveries')
            },
            {
                id: 'progressive-gifts',
                name: t('Progressive gifts'),
                description: t('Unlock free gifts as customers add more items to their cart')
            }
        ];

    const [step, setStep] = useState(1);

    // const [productSelection, setProductSelection] = useState('specific-selected');

    const [showProductModal, setShowProductModal] = useState(false);
    const [productModalData, setProductModalData] = useState<productModalDataType[]>([]);
    const [customersData, setCustomersData] = useState<productModalDataType[]>([]);
    const [customerSegmentsData, setCustomerSegmentsData] = useState<productModalDataType[]>([]);

    const [basicInformation, setBasicInformation] = useState<BasicInformationType>({
        offerName: `#Bundle ${Date.now()}`,
        offerType: 'quantity-breaks-same',
    });

    const [selectedProducts, setSelectedProducts] = useState<productModalDataType[]>([]);

    const [discountRules, setDiscountRules] = useState<WholeHouseRentalDiscountRuleType[]>([
        {
            id: 0,
            isExpanded: true,
            buyQty: 1,
            discountRate: 0.9,
            title: 'Item Title',
            subtitle: 'Item Subtitle',
            labelText: 'SAVE {{saved_percentage}}',
            badgeText: 'Badge Text',
            selectedByDefault: true,
            upsellProducts: [],
            freegiftProducts: [],
            showAsSoldOut: false,
        },
    ]);
    const [styleConfigData, setStyleConfigData] = useState<StyleConfigType>({
        base_style: "vertical_stack",
        card_background_color: '#FFFFFF',
        card_label_color: '#000000',
        card_border_color: '#E5E5E5',
        card_title_text: 'Item Title',
        card_title_text_fontSize: '16px',
        card_title_text_fontStyle: "normal",
        card_title_color: '#000000',
        card_button_text: 'Button Text',
        card_button_primaryColor: '#000000',
        enable_countdown_timer: false,
        countdown_timer_config: {
            timer_duration: 1,
            timer_color: "#d82c0d",
        },
    })
    const [targetingSettingsData, setTargetingSettingsData] = useState<TargetingSettingsType>({
        eligibilityType: "all",
        eligibilityRadioData: [],
        marketVisibilitySettingData: [],
        startTime: null,
        endTime: null,
        totalBudget: null,
        dailyBudget: null,
        timesLimitForPercustomer: null,
        hideOfferAfterExpiration: true,
        showOfferToBots: false,
    })

    const [marketVisibilitySettingData, setMarketVisibilitySettingData] = useState<{
        value: string;
        label: string;
    }[]>([])
    const [mainModalType, setMainModalType] = useState<"CustomerSegments" | "Customer" | null>(null)

    const indeterminate = useMemo(() => {
        if (marketVisibilitySettingData.length)
            return targetingSettingsData.marketVisibilitySettingData.length > 0 && targetingSettingsData.marketVisibilitySettingData.length < marketVisibilitySettingData.length;
    }, [targetingSettingsData.marketVisibilitySettingData]);

    const checkAll = useMemo(() => {
        if (marketVisibilitySettingData.length)
            return targetingSettingsData.marketVisibilitySettingData.length == marketVisibilitySettingData.length;
    }, [targetingSettingsData.marketVisibilitySettingData]);

    const productModalDataFetcher = useFetcher<any>();
    const customerSegmentsDataFetcher = useFetcher<any>();
    const customersDataFetcher = useFetcher<any>();
    const shopMarketsDataFetcher = useFetcher<any>();
    const confirmFetcher = useFetcher<any>();

    useEffect(() => {
        productModalDataFetcher.submit({
            productVariantRequestBody: JSON.stringify({
                query: '',
            })
        }, { method: 'POST' })
        shopMarketsDataFetcher.submit({
            shopMarketsRequestBody: JSON.stringify({})
        }, { method: 'POST' })
    }, [])

    useEffect(() => {
        switch (true) {
            case mainModalType == "Customer":
                customersDataFetcher.submit({
                    customersRequestBody: JSON.stringify({
                        query: '',
                    })
                }, { method: 'POST' })
                break;
            case mainModalType == "CustomerSegments":
                customerSegmentsDataFetcher.submit({
                    customerSegmentsRequestBody: JSON.stringify({
                        query: '',
                    })
                }, { method: 'POST' })
                break;
            default:
                break;
        }
    }, [mainModalType])

    useEffect(() => {
        if (productModalDataFetcher.data) {
            if (productModalDataFetcher.data.success) {
                const productVariantsData = productModalDataFetcher.data.response?.productVariants?.nodes;
                if (productVariantsData?.length) {
                    const data = productVariantsData.map((variant: any) => {
                        return {
                            id: variant.id,
                            name: `${variant.product?.title} - ${variant.title}`,
                            price: variant.price,
                            image: variant.media?.edges[0]?.node?.preview?.image?.url,
                        }
                    })
                    setProductModalData(data);
                }
            }
        }
    }, [productModalDataFetcher.data])

    useEffect(() => {
        if (customerSegmentsDataFetcher.data) {
            if (customerSegmentsDataFetcher.data.success) {
                const customerSegmentsData = customerSegmentsDataFetcher.data.response?.segments?.nodes;
                if (customerSegmentsData?.length) {
                    const data = customerSegmentsData.map((segment: any) => {
                        return {
                            label: segment.name,
                            value: segment.id,
                        }
                    })
                    setCustomerSegmentsData(data);
                }
            }
        }
    }, [customerSegmentsDataFetcher.data])

    useEffect(() => {
        if (customersDataFetcher.data) {
            if (customersDataFetcher.data.success) {
                const customersData = customersDataFetcher.data.response?.customers?.nodes;
                if (customersData?.length) {
                    const data = customersData.map((customer: any) => {
                        return {
                            label: customer.firstName + ' ' + customer.lastName,
                            value: customer.id,
                        }
                    })
                    setCustomersData(data);
                }
            }
        }
    }, [customersDataFetcher.data])

    useEffect(() => {
        if (shopMarketsDataFetcher.data) {
            if (shopMarketsDataFetcher.data.success) {
                const marketsData = shopMarketsDataFetcher.data.response?.markets?.nodes;
                if (marketsData?.length) {
                    const data = marketsData.map((market: any) => {
                        return {
                            label: market?.name,
                            value: market?.id,
                        }
                    })
                    setMarketVisibilitySettingData(data);
                }
            }
        }
    }, [shopMarketsDataFetcher.data])

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

    const onCheckAllChange: CheckboxProps['onChange'] = (e) => {
        const data = marketVisibilitySettingData.map((market) =>
            market?.value,
        )

        setTargetingSettingsData({
            ...targetingSettingsData,
            marketVisibilitySettingData: e.target.checked ? data : [],
        });
    };

    const eligibilityBrowse = () => {
        if (targetingSettingsData?.eligibilityType == "segments")
            setMainModalType("CustomerSegments")
        if (targetingSettingsData?.eligibilityType == "customers")
            setMainModalType("Customer")
    }

    const isOfferType = (v: string): v is OfferType => {
        return ["quantity-breaks-same", "bogo", "quantity-breaks-different", "complete-bundle", "subscription", "progressive-gifts"].includes(v);
    };

    const handleConfirm = () => {
        const selectedProductVariantIds = selectedProducts.map((product) => product.id);

        let jsondata = {
            automaticAppDiscount: {
                title: basicInformation?.offerName,
                functionHandle: "ciwi-bundle-multiple-products-discount-function",
                startsAt: dayjs(targetingSettingsData?.startTime).toISOString(),
                endsAt: targetingSettingsData?.endTime ? dayjs(targetingSettingsData?.endTime).toISOString() : null,
                combinesWith: {
                    orderDiscounts: true,
                    productDiscounts: true,
                    shippingDiscounts: true
                },
                metafields: [
                    {
                        namespace: "basic_information",
                        key: "basic_information",
                        type: "json",
                        value: JSON.stringify(basicInformation)
                    },
                    {
                        namespace: "discount_rules",
                        key: "discount_rules",
                        type: "json",
                        value: JSON.stringify(discountRules)
                    },
                    {
                        namespace: "style_config_data",
                        key: "style_config_data",
                        type: "json",
                        value: JSON.stringify(styleConfigData)
                    },
                    {
                        namespace: "targeting_settings_data",
                        key: "targeting_settings_data",
                        type: "json",
                        value: JSON.stringify(targetingSettingsData)
                    },
                    {
                        namespace: "selected_product_variant_ids",
                        key: "selected_product_variant_ids",
                        type: "json",
                        value: JSON.stringify(selectedProductVariantIds)
                    }
                ],
                discountClasses: [
                    "PRODUCT",
                ]
            }
        }

        console.log("jsondata: ", jsondata);
        confirmFetcher.submit({
            discountAutomaticAppCreateRequestBody: JSON.stringify(jsondata)
        }, { method: "POST" });
    }

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
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px',
                        marginBottom: '24px',
                    }}
                    className="sm:flex sm:gap-[12px]"
                >
                    {steps.map((stepName, index) => {
                        const stepNumber = index + 1;
                        const isActive = step === stepNumber;
                        const isClickable = stepNumber <= step + 1;

                        return (
                            <div
                                key={index}
                                onClick={() => {
                                    if (isClickable) {
                                        setStep(stepNumber);
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px 8px',
                                    background: isActive ? '#008060' : '#f4f6f8',
                                    color: isActive ? 'white' : '#6d7175',
                                    borderRadius: '6px',
                                    textAlign: 'center',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: isClickable ? 'pointer' : 'not-allowed',
                                    opacity: isClickable ? 1 : 0.5,
                                }}
                                className="sm:text-[14px] sm:p-[12px]"
                            >
                                <span className="hidden sm:inline">{stepNumber}. </span>
                                {stepName}
                            </div>
                        );
                    })}
                </div>

                <div className="polaris-layout">
                    {step === 1 && (
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
                                            value={basicInformation.offerType}
                                            onChange={(value) => {
                                                setBasicInformation({
                                                    ...basicInformation,
                                                    offerType: value
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
                                    {offerTypes.find(type => type.id === basicInformation.offerType)?.description}
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
                                    {basicInformation.offerType === 'quantity-breaks-same' && (
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

                                    {basicInformation.offerType === 'bogo' && (
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

                                    {basicInformation.offerType === 'quantity-breaks-different' && (
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

                                    {basicInformation.offerType === 'complete-bundle' && (
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

                                    {basicInformation.offerType === 'subscription' && (
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

                                    {basicInformation.offerType === 'progressive-gifts' && (
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
                                            {productModalData.map(product => (
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
                                        {offerTypes.find(type => type.id === basicInformation.offerType)?.description}
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
                                        {basicInformation.offerType === 'quantity-breaks-same' && (
                                            <>
                                                {discountRules.map((rule, index) => {
                                                    return (
                                                        <div key={index} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', marginBottom: '12px', position: 'relative', background: rule.badgeText ? '#ffffff' : '#f9fafb' }}>
                                                            {rule.badgeText && <div style={{ position: 'absolute', top: '-8px', right: '12px', background: '#000', color: '#fff', padding: '2px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {rule.badgeText}
                                                            </div>}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Radio style={{ width: '16px', height: '16px' }} />
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
                                                })}
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
                                    {basicInformation.offerType === 'quantity-breaks-same' && (
                                        <>
                                            {discountRules.map((rule, index) => {
                                                return (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            border: rule.badgeText ? '2px solid #000' : `1px solid ${styleConfigData?.card_border_color}`,
                                                            borderRadius: '8px',
                                                            padding: '12px',
                                                            marginBottom: '12px',
                                                            position: 'relative',
                                                            background: styleConfigData?.card_background_color
                                                        }}
                                                    >
                                                        {rule.badgeText && <div style={{ position: 'absolute', top: '-8px', right: '12px', background: '#000', color: '#fff', padding: '2px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {rule.badgeText}
                                                        </div>}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Radio style={{ width: '16px', height: '16px' }} />
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
                    )}

                    {step === 4 && (
                        <div>
                            <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Targeting & Settings</h2>

                            {/* Target Audience */}
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Eligibility</h3>
                                <div className="polaris-stack polaris-stack--vertical">
                                    <label style={{ fontSize: '14px', fontWeight: 500 }}>
                                        Available on all sales channels
                                        <div style={{
                                            marginTop: '8px',
                                            border: '1px solid #dfe3e8',
                                            borderRadius: '6px',
                                            padding: '12px',
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "8px"
                                        }}>
                                            <Radio.Group
                                                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                                                value={targetingSettingsData?.eligibilityType}
                                                onChange={(e) =>
                                                    setTargetingSettingsData({
                                                        ...targetingSettingsData,
                                                        eligibilityType: e.target.value
                                                    })
                                                }
                                                options={[
                                                    { value: "all", label: t('All customers') },
                                                    { value: "segments", label: t('Specific customer segments') },
                                                    { value: "customers", label: t('Specific customers') },
                                                ]}
                                            />
                                            {targetingSettingsData?.eligibilityType !== "all" && (
                                                <Space.Compact style={{ width: '100%' }}>
                                                    <Input
                                                        placeholder={t(
                                                            targetingSettingsData?.eligibilityType === "customers"
                                                                ? 'Search customers'
                                                                : 'Search customer segments'
                                                        )}
                                                    />
                                                    <Button
                                                        type="primary"
                                                        style={{ boxShadow: undefined }}
                                                        onClick={() => eligibilityBrowse()}
                                                    >
                                                        {t('Browse')}
                                                    </Button>
                                                </Space.Compact>
                                            )}
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
                                        }}>
                                            <Checkbox indeterminate={indeterminate} onChange={onCheckAllChange} checked={checkAll}>
                                                Check all
                                            </Checkbox>
                                            <Divider style={{ margin: '10px 0' }} />
                                            <Row>
                                                {
                                                    marketVisibilitySettingData.map((item, index) => (
                                                        <Col span={12} key={index}>
                                                            <Checkbox
                                                                value={item.value}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    if (checked) {
                                                                        setTargetingSettingsData({
                                                                            ...targetingSettingsData,
                                                                            marketVisibilitySettingData: [...targetingSettingsData.marketVisibilitySettingData, e.target.value]
                                                                        })
                                                                    } else {
                                                                        setTargetingSettingsData({
                                                                            ...targetingSettingsData,
                                                                            marketVisibilitySettingData: targetingSettingsData.marketVisibilitySettingData.filter((item) => item !== e.target.value)
                                                                        })
                                                                    }
                                                                }}
                                                                checked={targetingSettingsData?.marketVisibilitySettingData?.includes(item.value)}
                                                            >
                                                                {item.label}
                                                            </Checkbox>
                                                        </Col>
                                                    ))
                                                }
                                            </Row>
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
                                    <Flex
                                        align="left"
                                        vertical
                                        flex={1}
                                        style={{
                                            fontSize: '14px',
                                            fontWeight: 500
                                        }}
                                        gap={8}
                                    >
                                        <Text>{t("Start Time")}</Text>
                                        <DatePicker
                                            showTime
                                            needConfirm={false}
                                            value={targetingSettingsData.startTime}
                                            onChange={(value) => {
                                                if (value)
                                                    setTargetingSettingsData({
                                                        ...targetingSettingsData,
                                                        startTime: value
                                                    })
                                            }}
                                        />
                                        <Text style={{ fontSize: '12px', color: '#6d7175' }}>
                                            When the offer becomes active
                                        </Text>
                                    </Flex>
                                    <Flex
                                        align="left"
                                        vertical
                                        flex={1}
                                        gap={8}
                                        style={{ fontSize: '14px', fontWeight: 500 }}
                                    >
                                        <Text>{t("End Time")}</Text>
                                        <DatePicker
                                            showTime
                                            needConfirm={false}
                                            value={targetingSettingsData.endTime}
                                            onChange={(value) => {
                                                if (value)
                                                    setTargetingSettingsData({
                                                        ...targetingSettingsData,
                                                        endTime: value
                                                    })
                                            }}
                                        />
                                        <Text style={{ fontSize: '12px', color: '#6d7175' }}>
                                            When the offer expires
                                        </Text>
                                    </Flex>
                                </div>
                            </div>

                            {/* Budget */}
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Budget</h3>
                                <div className="polaris-grid">
                                    <Flex
                                        align="left"
                                        vertical
                                        flex={1}
                                        gap={8}
                                        style={{
                                            fontSize: '14px',
                                            fontWeight: 500
                                        }}
                                    >
                                        <Text>{t("Total Budget (Optional)")}</Text>
                                        <InputNumber
                                            style={{
                                                width: '100%',
                                            }}
                                            placeholder="$0.00"
                                            value={targetingSettingsData.totalBudget}
                                            onChange={(value) => {
                                                if (typeof value === 'number' && value > 0)
                                                    setTargetingSettingsData({
                                                        ...targetingSettingsData,
                                                        totalBudget: value
                                                    })
                                            }}
                                        />
                                        <Text style={{ fontSize: '12px', color: '#6d7175' }}>
                                            {t("Maximum total spend for this offer")}
                                        </Text>
                                    </Flex>
                                    <Flex
                                        align="left"
                                        vertical
                                        flex={1}
                                        gap={8}
                                        style={{
                                            fontSize: '14px',
                                            fontWeight: 500
                                        }}
                                    >
                                        <Text>{t("Daily Budget (Optional)")}</Text>
                                        <InputNumber
                                            style={{
                                                width: '100%',
                                            }}
                                            placeholder="$0.00"
                                            value={targetingSettingsData.dailyBudget}
                                            onChange={(value) => {
                                                if (typeof value === 'number' && value > 0)
                                                    setTargetingSettingsData({
                                                        ...targetingSettingsData,
                                                        dailyBudget: value
                                                    })
                                            }}
                                        />
                                        <Text style={{ fontSize: '12px', color: '#6d7175' }}>
                                            {t("Maximum spend per day")}
                                        </Text>
                                    </Flex>
                                </div>
                            </div>

                            {/* Risk Control */}
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Risk Control</h3>
                                <div className="polaris-stack polaris-stack--vertical">
                                    <Flex
                                        align="left"
                                        vertical
                                        flex={1}
                                        gap={8}
                                    >
                                        <Text>{t("Usage Limit Per Customer")}</Text>
                                        <Select
                                            style={{
                                                width: '100%',
                                            }}
                                            options={[
                                                { value: null, label: t('Unlimited') },
                                                { value: 1, label: t('1 time only') },
                                                { value: 2, label: t('2 times') },
                                                { value: 3, label: t('3 times') },
                                                { value: 5, label: t('5 times') },
                                                { value: 10, label: t('10 times') },
                                            ]}
                                            value={targetingSettingsData.timesLimitForPercustomer}
                                            onChange={(value) => {
                                                setTargetingSettingsData({
                                                    ...targetingSettingsData,
                                                    timesLimitForPercustomer: value,
                                                });
                                            }}
                                        />
                                        <Text style={{ fontSize: '12px', color: '#6d7175' }}>
                                            {t("How many times each customer can use this offer")}
                                        </Text>
                                    </Flex>

                                    <Flex
                                        style={{
                                            marginTop: '16px',
                                            border: '1px solid #dfe3e8',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        <Checkbox
                                            defaultChecked={true}
                                            checked={targetingSettingsData.hideOfferAfterExpiration}
                                            onChange={() => {
                                                setTargetingSettingsData({
                                                    ...targetingSettingsData,
                                                    hideOfferAfterExpiration: !targetingSettingsData.hideOfferAfterExpiration,
                                                });
                                            }}
                                        >
                                            <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                                                {t("Hide offer after expiration")}
                                            </Text>
                                        </Checkbox>
                                        <Text style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                                            {t("Don't display the offer widget after the end date")}
                                        </Text>
                                    </Flex>

                                    <Flex
                                        style={{
                                            marginTop: '16px',
                                            border: '1px solid #dfe3e8',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            flexDirection: 'column',
                                        }}
                                    >
                                        <Checkbox
                                            defaultChecked={true}
                                            checked={targetingSettingsData.showOfferToBots}
                                            onChange={() => {
                                                setTargetingSettingsData({
                                                    ...targetingSettingsData,
                                                    showOfferToBots: !targetingSettingsData.showOfferToBots,
                                                });
                                            }}
                                        >
                                            <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                                                {t("Show offer to bots/crawlers")}
                                            </Text>
                                        </Checkbox>
                                        <Text style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                                            {t("Display offer information to search engine crawlers and bots")}
                                        </Text>
                                    </Flex>
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
                    onClick={
                        () => {
                            step < 4 ? setStep(step + 1) : handleConfirm()
                        }
                    }
                >
                    {step === 4 ? 'Create Offer' : 'Next'}
                </button>
            </div>
        </div>
    );
};

export default Index;