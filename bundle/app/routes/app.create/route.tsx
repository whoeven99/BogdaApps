import { ActionFunctionArgs } from "@remix-run/node";
import { useFetcher, useNavigate } from "@remix-run/react";
import { mutationDiscountAutomaticAppCreateAndMetafieldsSet, queryCustomers, queryMarkets, queryProductVariants, querySegments } from "app/api/admin";
import { authenticate } from "app/shopify.server";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from 'dayjs';
import BasicInformationSetting from "./components/basicInformationSetting";
import ProductsAndDiscountsSetting from "./components/productsAndDiscountsSetting";
import Header from "app/components/header";
import StyleDesignSetting from "./components/styleDesignSetting";
import ScheduleAndBudgetSetting from "./components/scheduleAndBudgetSetting";
import ProductModal from "./components/productModal";
import { Button } from "antd";
import SegmentModal from "./components/segmentModal";

export interface ProductVariantsDataType {
    id: string;
    name: string;
    price: string;
    image: string
}

export interface BasicInformationType {
    offerName: string;
    offerType: string;
}

export interface DiscountRulesType {
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

export interface StyleConfigType {
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

export interface TargetingSettingsType {
    eligibilityType: "all" | "segments" | "customers";
    customersData: {
        label: string;
        value: string;
    }[];
    segmentData: {
        label: string;
        value: string;
    }[];
    marketVisibilitySettingData: string[];
    startsAt: Date | null;
    endsAt: Date | null;
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
    const discountAutomaticAppCreateAndMetafieldsSetRequestBody = JSON.parse(
        formData.get("discountAutomaticAppCreateAndMetafieldsSetRequestBody") as string,
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
        case !!discountAutomaticAppCreateAndMetafieldsSetRequestBody:
            try {
                const discountAutomaticAppCreateAndMetafieldsSetData = await mutationDiscountAutomaticAppCreateAndMetafieldsSet({
                    shop,
                    accessToken: accessToken || "",
                    variables: discountAutomaticAppCreateAndMetafieldsSetRequestBody,
                });

                if (discountAutomaticAppCreateAndMetafieldsSetData) {
                    return {
                        success: true,
                        errorCode: 0,
                        errorMsg: "",
                        response: discountAutomaticAppCreateAndMetafieldsSetData,
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
    }[] = [
            {
                id: 'quantity-breaks-same',
                name: t('Quantity breaks for the same product'),
                description: t('Offer discounts when customers buy multiple quantities of the same product'),
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

    const [selectedProducts, setSelectedProducts] = useState<ProductVariantsDataType[]>([]);
    // const [customersData, setCustomersData] = useState<{ label: string; value: string; }[]>([]);
    // const [customerSegmentsData, setCustomerSegmentsData] = useState<{ label: string; value: string; }[]>([]);
    const [marketVisibilitySettingData, setMarketVisibilitySettingData] = useState<{
        value: string;
        label: string;
    }[]>([])
    const [selectedRuleIndex, setSelectedRuleIndex] = useState<number>(1);

    const [basicInformation, setBasicInformation] = useState<BasicInformationType>({
        offerName: `#Bundle ${Date.now()}`,
        offerType: 'quantity-breaks-same',
    });
    const [discountRules, setDiscountRules] = useState<DiscountRulesType[]>([
        {
            id: Date.now(),
            isExpanded: true,
            buyQty: 1,
            discountRate: 1,
            title: 'Single',
            subtitle: 'single',
            labelText: '',
            badgeText: '',
            selectedByDefault: false,
            upsellProducts: [],
            freegiftProducts: [],
            showAsSoldOut: false,
        },
        {
            id: Date.now() + 1,
            isExpanded: true,
            buyQty: 2,
            discountRate: 0.8,
            title: 'Duo',
            subtitle: 'duo',
            labelText: 'SAVE 20%',
            badgeText: 'Popular',
            selectedByDefault: true,
            upsellProducts: [],
            freegiftProducts: [],
            showAsSoldOut: false,
        },
    ]);

    const [styleConfigData, setStyleConfigData] = useState<StyleConfigType>({
        base_style: "vertical_stack",
        card_background_color: '#FFFFFF',
        card_label_color: '#10f32eff',
        card_border_color: '#E5E5E5',
        card_title_text: 'BUNDLE & SAVE',
        card_title_text_fontSize: '16px',
        card_title_text_fontStyle: "normal",
        card_title_color: '#000000',
        card_button_text: 'Add to cart',
        card_button_primaryColor: '#000000',
        enable_countdown_timer: false,
        countdown_timer_config: {
            timer_duration: 1,
            timer_color: "#d82c0d",
        },
    })

    const [targetingSettingsData, setTargetingSettingsData] = useState<TargetingSettingsType>({
        eligibilityType: "all",
        customersData: [],
        segmentData: [],
        marketVisibilitySettingData: [],
        startsAt: null,
        endsAt: null,
        totalBudget: null,
        dailyBudget: null,
        timesLimitForPercustomer: null,
        hideOfferAfterExpiration: true,
        showOfferToBots: false,
    })

    const [mainModalType, setMainModalType] = useState<"ProductVariants" | "CustomerSegments" | "Customer" | null>(null)

    const selectedOfferType = useMemo(() => {
        return offerTypes.find(type => type.id == basicInformation.offerType) || offerTypes[0]
    }, [basicInformation])

    const shopMarketsDataFetcher = useFetcher<any>();
    const customerSegmentsDataFetcher = useFetcher<any>();
    const customersDataFetcher = useFetcher<any>();
    const confirmFetcher = useFetcher<any>();

    useEffect(() => {
        shopMarketsDataFetcher.submit({
            shopMarketsRequestBody: JSON.stringify({})
        }, { method: 'POST' })
    }, [])

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

    // useEffect(() => {
    //     if (customersDataFetcher.data) {
    //         if (customersDataFetcher.data.success) {
    //             const customersData = customersDataFetcher.data.response?.customers?.nodes;
    //             if (customersData?.length) {
    //                 const data = customersData.map((customer: any) => {
    //                     return {
    //                         label: customer.firstName + ' ' + customer.lastName,
    //                         value: customer.id,
    //                     }
    //                 })
    //                 setCustomersData(data);
    //             }
    //         }
    //     }
    // }, [customersDataFetcher.data])

    useEffect(() => {
        if (confirmFetcher.data) {
            if (confirmFetcher.data.success) {
                shopify.toast.show(t("Offer created successfully"))
                navigate('/app');
            }
        }
    }, [confirmFetcher.data])

    const handleConfirm = () => {
        const selectedProductVariantIds = selectedProducts.map((product) => product.id.split("gid://shopify/ProductVariant/")[1]);

        const metafieldValue = {
            ...{ basicInformation },
            ...{ discountRules },
            ...{ styleConfigData },
            ...{
                targetingSettingsData: {
                    ...targetingSettingsData,
                    startsAt: dayjs(targetingSettingsData?.startsAt).toISOString(),
                    endsAt: targetingSettingsData?.endsAt ? dayjs(targetingSettingsData?.endsAt).toISOString() : null,
                    segmentData: targetingSettingsData?.segmentData?.map((segment: any) => segment.value),
                }
            },
            selectedProductVariantIds,
        }

        const discountAutomaticAppCreateAndMetafieldsSetRequestJsondata = {
            automaticAppDiscount: {
                title: basicInformation?.offerName,
                functionHandle: "ciwi-bundle-multiple-products-discount-function",
                startsAt: dayjs(targetingSettingsData?.startsAt).toISOString(),
                endsAt: targetingSettingsData?.endsAt ? dayjs(targetingSettingsData?.endsAt).toISOString() : null,
                combinesWith: {
                    orderDiscounts: true,
                    productDiscounts: true,
                    shippingDiscounts: true
                },
                metafields: [
                    {
                        key: `basic_information`,
                        namespace: "ciwi_bundles_config",
                        type: "json",
                        value: JSON.stringify(basicInformation)
                    },
                    {
                        key: `discount_rules`,
                        namespace: "ciwi_bundles_config",
                        type: "json",
                        value: JSON.stringify(discountRules)
                    },
                    {
                        key: `style_config`,
                        namespace: "ciwi_bundles_config",
                        type: "json",
                        value: JSON.stringify(styleConfigData)
                    },
                    {
                        key: `targeting_settings`,
                        namespace: "ciwi_bundles_config",
                        type: "json",
                        value: JSON.stringify({
                            ...targetingSettingsData,
                            startsAt: dayjs(targetingSettingsData?.startsAt).toISOString(),
                            endsAt: targetingSettingsData?.endsAt ? dayjs(targetingSettingsData?.endsAt).toISOString() : null,
                            segmentData: targetingSettingsData?.segmentData?.map((segment: any) => segment.value),
                        })
                    },
                    {
                        key: `selected_product_variant_ids`,
                        namespace: "ciwi_bundles_config",
                        type: "json",
                        value: JSON.stringify(selectedProductVariantIds)
                    },
                ],
                discountClasses: [
                    "PRODUCT",
                ]
            },
            metafields: [
                {
                    key: `ciwi_bundles_config_${Date.now()}`,
                    namespace: "ciwi_bundles_config",
                    ownerId: "gid://shopify/Shop/71469596922",
                    type: "json",
                    value: JSON.stringify(metafieldValue)
                },
            ],
        }

        confirmFetcher.submit({
            discountAutomaticAppCreateAndMetafieldsSetRequestBody:
                JSON.stringify(
                    discountAutomaticAppCreateAndMetafieldsSetRequestJsondata
                ),
        }, { method: "POST" });
    }

    return (
        <div className="polaris-page">

            <Header backUrl="/app" title="Create New Offer" />

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
                    {step === 1 && <BasicInformationSetting offerTypes={offerTypes} basicInformation={basicInformation} setBasicInformation={setBasicInformation} />}

                    {step === 2 && (
                        <>
                            {/* Product Modal */}
                            <ProductModal
                                mainModalType={mainModalType}
                                setMainModalType={setMainModalType}
                                selectedProducts={selectedProducts}
                                setSelectedProducts={setSelectedProducts}
                            />

                            <ProductsAndDiscountsSetting
                                selectedProducts={selectedProducts}
                                setMainModalType={setMainModalType}
                                discountRules={discountRules}
                                setDiscountRules={setDiscountRules}
                                selectedRuleIndex={selectedRuleIndex}
                                setSelectedRuleIndex={setSelectedRuleIndex}
                                selectedOfferType={selectedOfferType}
                            />
                        </>
                    )}

                    {step === 3 && (
                        <StyleDesignSetting
                            styleConfigData={styleConfigData}
                            setStyleConfigData={setStyleConfigData}
                            discountRules={discountRules}
                            selectedOfferType={selectedOfferType}
                            selectedRuleIndex={selectedRuleIndex}
                            setSelectedRuleIndex={setSelectedRuleIndex}
                        />
                    )}

                    {step === 4 && (
                        <>
                            <SegmentModal
                                mainModalType={mainModalType}
                                setMainModalType={setMainModalType}
                                targetingSettingsData={targetingSettingsData}
                                setTargetingSettingsData={setTargetingSettingsData}
                            />

                            <ScheduleAndBudgetSetting
                                targetingSettingsData={targetingSettingsData}
                                setTargetingSettingsData={setTargetingSettingsData}
                                setMainModalType={setMainModalType}
                                marketVisibilitySettingData={marketVisibilitySettingData}
                            />
                        </>
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
                <Button
                    className="polaris-button"
                    loading={confirmFetcher.state === "submitting"}
                    onClick={
                        () => {
                            step < 4 ? setStep(step + 1) : handleConfirm()
                        }
                    }
                >
                    {step === 4 ? 'Create Offer' : 'Next'}
                </Button>
            </div>
        </div>
    );
};

export default Index;