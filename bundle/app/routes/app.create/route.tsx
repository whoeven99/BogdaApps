import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { mutationDiscountAutomaticAppCreateAndMetafieldsSet, mutationDiscountAutomaticAppUpdateAndMetafieldsSet, queryCustomers, queryMarkets, queryProducts, queryProductVariants, querySegments, queryShop, querySpecialProductVariants } from "app/api/admin";
import { authenticate } from "app/shopify.server";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from 'dayjs';
import BasicInformationSetting from "./components/basicInformationSetting";
import ProductsAndDiscountsSetting from "./components/productsAndDiscountsSetting";
import Header from "app/components/header";
import StyleDesignSetting from "./components/styleDesignSetting";
import ScheduleAndBudgetSetting from "./components/scheduleAndBudgetSetting";
import ProductModal from "./components/productModal";
import { Affix, Button, Flex, Spin } from "antd";
import { globalStore } from "app/globalStore";
import { GetUserDiscount, SaveUserDiscount, UpdateUserDiscount } from "app/api/javaServer";
import EditProductModal from "./components/editProductModal";

export interface ProductVariantsDataType {
    id: string;
    name: string;
    price: number;
    image: string
}

export interface BasicInformationType {
    offerName: string;
    displayName: string;
    offerType: {
        category: string;
        subtype:
        | "quantity-breaks-same"
        | "buy-x-get-y"
        | "quantity-breaks-different"
        | "complete-bundle"
        | "subscription"
        | "progressive-gifts"
        ;
    };
}

export interface DiscountRulesType {
    id: number;
    enabled: boolean;
    isExpanded: boolean;
    title: string;
    quantity: number;
    discount: {
        type: "percentage" | "amount" | "product"
        value: number;
        maxDiscount: number;
    };
    subtitle: string;
    labelText: string;
    badgeText: string;
    selectedByDefault: boolean;
    showAsSoldOut: boolean;
    discount_reward: {
        id: string;
        quantity: number; //奖品池，可以选择商品享受 discount 优惠
        discount: {
            type: "percentage" | "amount"
            value: number;
            maxDiscount: number;
        };
    }[];
    reward: {
        type: "discount" | "upsell" | "freegift" | "bundle";
        products: {
            variantId: string;
            quantity: number;
        }[];
        discount?: {
            type: "percentage" | "amount"
            value: number;
            maxDiscount: number;
        };
        display: {
            text: string;
            showOriginalPrice: boolean;
            visibleWithoutCheck: boolean;
        };
    }[];
}

export interface SubscriptionType {
    enable: boolean;
    settings: {
        layout: "checkbox" | "horizontal" | "vertical";
        position: "below" | "above";
        subscription_title: string;
        subscription_subtitle: string;
        oneTime_title: string;
        oneTime_subtitle: string;
        defaultSelected: boolean;
    }
    style: {
        colors: {
            title: string;
            subtitle: string;
        }
        sizes: {
            title: string;
            subtitle: string;
        }
    }
}

export interface ProgressiveGiftType {
    enable: boolean;
    settings: {
        layout: "horizontal" | "vertical";
        title: string;
        subtitle: string;
        hideTilUnlocked: boolean;
        showLabels: boolean;
        gifts: {
            type: "freegift" | "freeshipping";
            unlockedAt: number;
            label: string;
            labelCrossOut: string;
            title: string;
            lockedTitle: string;
            imgUrl: string;
            product?: {
                id: string;
                variantId: string[];
                title: string;
                imgUrl: string;
                quantity: number;
            }
        }[]
    }
    style: {
        colors: {
            title: string;
            subtitle: string;
        }
        sizes: {
            title: string;
            subtitle: string;
        }
    }
}

export interface StyleConfigType {
    layout: {
        base_style:
        | "vertical_stack"
        | "horizontal_grid"
        | "card_grid"
        | "compact_list";
    }; //布局类型    card_background_color: string;
    card: {
        background_color: string;
        border_color: string;
        label_color: string;
    }; //卡片基础样式
    title: {
        text: string;
        fontSize: string;
        fontWeight: "bold" | "normal" | "300";
        color: string;
    }; //标题样式
    button: {
        text: string;
        primaryColor: string;
    }; //行为按钮样式
    countdown: {
        enabled: boolean;
        duration: number;
        color: string;
    }; //倒计时组件配置
}

export interface TargetingSettingsType {
    marketVisibilitySettingData: string[];
    visibilityConstraints: {
        maxDiscountAmount: number;
        maxUsageCount: number;
    };
    schedule: {
        startsAt: Date | null;
        endsAt: Date | null;
        hideAfterExpiration: boolean;
    };
    budget: {
        totalBudget: number | null;
        usedTotalBudget: number | null;
        dailyBudget: number | null;
        usedDailyBudget: number | null;
    };
    usage_limit: {
        per_customer: number | null;
        per_product: number | null;
    };
    showOfferToBots: boolean;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    const discountGid = url.searchParams.get("discountGid");

    return {
        discountGid,
    };
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const adminAuthResult = await authenticate.admin(request);
    const { shop, accessToken } = adminAuthResult.session;

    const formData = await request.formData();

    const productVariantRequestBody = JSON.parse(
        formData.get("productVariantRequestBody") as string,
    );
    const productRequestBody = JSON.parse(
        formData.get("productRequestBody") as string,
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
    const productPoolRequestBody = JSON.parse(
        formData.get("productPoolRequestBody") as string,
    );
    const discountAutomaticAppUpdateAndMetafieldsSetRequestBody = JSON.parse(
        formData.get("discountAutomaticAppUpdateAndMetafieldsSetRequestBody") as string,
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
        case !!productRequestBody:
            try {
                const productData = await queryProducts({
                    ...productRequestBody,
                    shop,
                    accessToken,
                });

                if (productData) {
                    return {
                        success: true,
                        errorCode: 0,
                        errorMsg: "",
                        response: productData,
                    }
                }

                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            } catch (error) {
                console.error(`${shop} productRequestBody Error: `, error);
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
        case !!productPoolRequestBody:
            try {
                const productPoolData = await querySpecialProductVariants({
                    ...productPoolRequestBody,
                    shop,
                    accessToken,
                });

                if (productPoolData) {
                    return {
                        success: true,
                        errorCode: 0,
                        errorMsg: "",
                        response: productPoolData,
                    }
                }

                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            } catch (error) {
                console.error(`${shop} productPoolRequestBody Error: `, error);
                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            }
        case !!discountAutomaticAppCreateAndMetafieldsSetRequestBody:
            try {
                const variables = discountAutomaticAppCreateAndMetafieldsSetRequestBody?.discountAutomaticAppCreateAndMetafieldsSetRequestJsondata

                console.log("variables", JSON.stringify(variables));

                const shopData = await queryShop({
                    shop,
                    accessToken: accessToken || "",
                });

                const shopId = shopData?.shop?.id;

                if (!shopId) {
                    return {
                        success: false,
                        errorCode: 10001,
                        errorMsg: "SERVER_ERROR",
                        response: null,
                    }
                }

                variables.metafields[0].ownerId = shopId;

                const discountAutomaticAppCreateAndMetafieldsSetData = await mutationDiscountAutomaticAppCreateAndMetafieldsSet({
                    shop,
                    accessToken: accessToken || "",
                    variables,
                });

                if (discountAutomaticAppCreateAndMetafieldsSetData) {
                    const basic_information = discountAutomaticAppCreateAndMetafieldsSetRequestBody?.basic_information
                    const discount_rules = discountAutomaticAppCreateAndMetafieldsSetRequestBody?.discount_rules
                    const subscription = discountAutomaticAppCreateAndMetafieldsSetRequestBody?.subscription
                    const progressive_gift = discountAutomaticAppCreateAndMetafieldsSetRequestBody?.progressive_gift
                    const style_config = discountAutomaticAppCreateAndMetafieldsSetRequestBody?.style_config
                    const targeting_settings = discountAutomaticAppCreateAndMetafieldsSetRequestBody?.targeting_settings
                    const product_pool = discountAutomaticAppCreateAndMetafieldsSetRequestBody?.product_pool
                    const metafields = {
                        ...discountAutomaticAppCreateAndMetafieldsSetRequestBody?.metafields,
                        ownerId: shopId,
                    }

                    const data = {
                        shopName: shop,
                        discountGid: discountAutomaticAppCreateAndMetafieldsSetData?.discountAutomaticAppCreate?.automaticAppDiscount?.discountId,
                        status: "ACTIVE",
                        discountData: {
                            basic_information,
                            discount_rules,
                            subscription,
                            progressive_gift,
                            style_config,
                            targeting_settings,
                            product_pool,
                            metafields
                        },
                    }

                    const saveUserDiscount = await SaveUserDiscount({
                        shopName: shop,
                        data
                    })

                    return saveUserDiscount
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
        case !!discountAutomaticAppUpdateAndMetafieldsSetRequestBody:
            try {
                const variables = discountAutomaticAppUpdateAndMetafieldsSetRequestBody?.discountAutomaticAppUpdateAndMetafieldsSetRequestJsondata

                const discountAutomaticAppUpdateAndMetafieldsSetData = await mutationDiscountAutomaticAppUpdateAndMetafieldsSet({
                    shop,
                    accessToken: accessToken || "",
                    variables,
                })

                if (discountAutomaticAppUpdateAndMetafieldsSetData) {
                    const basic_information = discountAutomaticAppUpdateAndMetafieldsSetRequestBody?.basic_information
                    const discount_rules = discountAutomaticAppUpdateAndMetafieldsSetRequestBody?.discount_rules
                    const style_config = discountAutomaticAppUpdateAndMetafieldsSetRequestBody?.style_config
                    const targeting_settings = discountAutomaticAppUpdateAndMetafieldsSetRequestBody?.targeting_settings
                    const product_pool = discountAutomaticAppUpdateAndMetafieldsSetRequestBody?.product_pool
                    const metafields = {
                        ...discountAutomaticAppUpdateAndMetafieldsSetRequestBody?.metafields,
                    }

                    const data = {
                        shopName: shop,
                        discountGid: discountAutomaticAppUpdateAndMetafieldsSetData?.discountAutomaticAppUpdate?.automaticAppDiscount?.discountId,
                        discountData: {
                            basic_information,
                            discount_rules,
                            style_config,
                            targeting_settings,
                            product_pool,
                            metafields
                        },
                    }

                    console.log(data);

                    const updateUserDiscount = await UpdateUserDiscount({
                        shopName: shop,
                        data
                    })

                    return updateUserDiscount
                }

                return {
                    success: false,
                    errorCode: 10001,
                    errorMsg: "SERVER_ERROR",
                    response: null,
                }
            } catch (error) {
                console.error(`${shop} discountAutomaticAppUpdateAndMetafieldsSetRequestBody Error: `, error);
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
    const { discountGid } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const metafieldsRef = useRef<any>(null);

    const productPoolDataFetcher = useFetcher<any>();
    const shopMarketsDataFetcher = useFetcher<any>();
    const customerSegmentsDataFetcher = useFetcher<any>();
    const customersDataFetcher = useFetcher<any>();
    const confirmFetcher = useFetcher<any>();

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
                id: "quantity-breaks-same",
                name: t("Quantity breaks for the same product"),
                description: t("Offer discounts when customers buy multiple quantities of the same product"),
            },
            {
                id: "buy-x-get-y",
                name: t("Buy X, get Y free (BOGO) deal"),
                description: t("Create buy-one-get-one or buy-X-get-Y-free promotions")
            },
            // {
            //     id: 'quantity-breaks-different',
            //     name: t('Quantity breaks for different products'),
            //     description: t('Offer discounts when customers buy multiple different products together')
            // },
            // {
            //     id: 'complete-bundle',
            //     name: t('Complete the bundle'),
            //     description: t('Encourage customers to complete a bundle by adding recommended products')
            // },
            // {
            //     id: 'subscription',
            //     name: t('Subscription'),
            //     description: t('Offer recurring subscription discounts for regular deliveries')
            // },
            // {
            //     id: 'progressive-gifts',
            //     name: t('Progressive gifts'),
            //     description: t('Unlock free gifts as customers add more items to their cart')
            // }
        ];

    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1);

    const [selectedProducts, setSelectedProducts] = useState<ProductVariantsDataType[]>([]);
    const [marketVisibilitySettingData, setMarketVisibilitySettingData] = useState<{
        value: string;
        label: string;
    }[]>([])

    const [selectedRuleIndex, setSelectedRuleIndex] = useState<number | null>(null);

    const [basicInformation, setBasicInformation] = useState<BasicInformationType>({
        offerName: "",
        displayName: `#Bundle ${Date.now()}`,
        offerType: {
            category: "product",
            subtype: "quantity-breaks-same"
        },
    });

    const [discountRules, setDiscountRules] = useState<DiscountRulesType[]>([
        {
            id: Date.now(),
            enabled: true,
            isExpanded: true,
            quantity: 1,
            discount: {
                type: "percentage",
                value: 1,
                maxDiscount: 1,
            },
            discount_reward: [],
            title: 'Single',
            subtitle: 'single',
            labelText: '',
            badgeText: '',
            selectedByDefault: false,
            reward: [],
            showAsSoldOut: false,
        },
        {
            id: Date.now() + 1,
            enabled: true,
            isExpanded: true,
            quantity: 2,
            discount: {
                type: "percentage",
                value: 0.8,
                maxDiscount: 100,
            },
            discount_reward: [],
            title: 'Duo',
            subtitle: 'duo',
            labelText: 'SAVE 20%',
            badgeText: 'Popular',
            selectedByDefault: true,
            reward: [],
            showAsSoldOut: false,
        },
    ]);

    const [subscriptionData, setSubscriptionData] = useState<SubscriptionType>({
        enable: false,
        settings: {
            layout: "checkbox",
            position: "below",
            subscription_title: "Subscribe & Save 20%",
            subscription_subtitle: "Delivered weekly",
            oneTime_title: "One-time purchase",
            oneTime_subtitle: "",
            defaultSelected: false,
        },
        style: {
            colors: {
                title: "#000",
                subtitle: "#000",
            },
            sizes: {
                title: "15px",
                subtitle: "13px",
            }
        }
    })

    const [progressiveGiftData, setProgressiveGiftData] = useState<ProgressiveGiftType>({
        enable: false,
        settings: {
            layout: "horizontal",
            title: "🎁 Free gifts with your order",
            subtitle: "Unlock selecting a higher bundle",
            hideTilUnlocked: false,
            showLabels: true,
            gifts: []
        },
        style: {
            colors: {
                title: "#000",
                subtitle: "#000",
            },
            sizes: {
                title: "15px",
                subtitle: "13px",
            }
        }
    })

    const [styleConfigData, setStyleConfigData] = useState<StyleConfigType>({
        layout: {
            base_style: "vertical_stack",
        },
        card: {
            background_color: '#FFFFFF',
            border_color: '#E5E5E5',
            label_color: '#10f32e',
        },
        title: {
            text: 'BUNDLE & SAVE',
            fontSize: '16px',
            fontWeight: "normal",
            color: '#000000',
        },
        button: {
            text: 'Add to cart',
            primaryColor: '#000000',
        },
        countdown: {
            enabled: false,
            duration: 1,
            color: "#d82c0d",
        },
    })

    const [targetingSettingsData, setTargetingSettingsData] = useState<TargetingSettingsType>({
        marketVisibilitySettingData: [],
        visibilityConstraints: {
            maxDiscountAmount: 100,
            maxUsageCount: 2
        },
        schedule: {
            startsAt: null,
            endsAt: null,
            hideAfterExpiration: true,
        },
        budget: {
            totalBudget: null,
            usedTotalBudget: null,
            dailyBudget: null,
            usedDailyBudget: null,
        },
        usage_limit: {
            per_customer: null,
            per_product: null,
        },
        showOfferToBots: false,
    })

    const [mainModalType, setMainModalType] = useState<"ProductVariants" | "EditProductVariants" | null>(null)

    const selectedOfferType = useMemo(() => {
        return offerTypes.find(type => type.id == basicInformation.offerType?.subtype) || offerTypes[0]
    }, [basicInformation])

    const previewPrice: number = useMemo(() => {
        if (selectedProducts.length > 0) {
            return selectedProducts[0].price;
        }
        return 65;
    }, [selectedProducts])

    const durationDays = useMemo(() => {
        const { startsAt, endsAt } = targetingSettingsData.schedule;
        if (!startsAt || !endsAt) return 0;

        const start = dayjs(startsAt).startOf("day");
        const end = dayjs(endsAt).startOf("day");

        return end.diff(start, "day") + 1;
    }, [
        targetingSettingsData.schedule.startsAt,
        targetingSettingsData.schedule.endsAt
    ]);

    const maxDailyBudget = useMemo(() => {
        const total = targetingSettingsData.budget.totalBudget;
        if (!total) return 0;
        if (!durationDays) return total;
        return total / durationDays;
    }, [targetingSettingsData.budget.totalBudget, durationDays]);

    const dailyBudgetError = useMemo(() => !!targetingSettingsData.budget.dailyBudget && maxDailyBudget > 0 &&
        targetingSettingsData.budget.dailyBudget > maxDailyBudget, [targetingSettingsData, maxDailyBudget])

    useEffect(() => {
        shopMarketsDataFetcher.submit({
            shopMarketsRequestBody: JSON.stringify({})
        }, { method: 'POST' })
        if (discountGid) {
            getUserDiscount(discountGid)
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        if (basicInformation.offerType.subtype === "buy-x-get-y") {
            setDiscountRules([
                {
                    id: Date.now(),
                    enabled: true,
                    isExpanded: true,
                    quantity: 1,
                    discount: {
                        type: "product",
                        value: 0,
                        maxDiscount: 1,
                    },
                    discount_reward: [],
                    title: 'Single',
                    subtitle: 'single',
                    labelText: '',
                    badgeText: '',
                    selectedByDefault: false,
                    reward: [],
                    showAsSoldOut: false,
                },
                {
                    id: Date.now() + 1,
                    enabled: true,
                    isExpanded: true,
                    quantity: 3,
                    discount: {
                        type: "product",
                        value: 1,
                        maxDiscount: 1,
                    },
                    discount_reward: [],
                    title: 'Buy 2 Get 1',
                    subtitle: 'buy 2 get 1',
                    labelText: 'SAVE 33%',
                    badgeText: 'Popular',
                    selectedByDefault: true,
                    reward: [],
                    showAsSoldOut: false,
                },
            ])
        }
    }, [basicInformation])

    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    }, [step]);

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

    // useEffect(() => {
    //     switch (true) {
    //         case mainModalType == "Customer":
    //             customersDataFetcher.submit({
    //                 customersRequestBody: JSON.stringify({
    //                     query: '',
    //                 })
    //             }, { method: 'POST' })
    //             break;
    //         case mainModalType == "CustomerSegments":
    //             customerSegmentsDataFetcher.submit({
    //                 customerSegmentsRequestBody: JSON.stringify({
    //                     query: '',
    //                 })
    //             }, { method: 'POST' })
    //             break;
    //         default:
    //             break;
    //     }
    // }, [mainModalType])

    useEffect(() => {
        if (confirmFetcher.data) {
            if (confirmFetcher.data.success) {
                const discountGid = confirmFetcher.data.response?.discountGid
                if (discountGid) {
                    localStorage.setItem("ciwi_new_offer_id", discountGid)
                }
                shopify.toast.show(t(discountGid ? "Offer updated successfully" : "Offer created successfully"))
                navigate('/app');
            }
        }
    }, [confirmFetcher.data])

    useEffect(() => {
        if (productPoolDataFetcher.data) {
            if (productPoolDataFetcher.data.success) {
                const data = productPoolDataFetcher.data.response
                const productPoolData = data?.nodes?.map((variant: any) => {
                    return {
                        id: variant?.id,
                        name: `${variant?.product?.title} - ${variant?.title}`,
                        price: variant?.price,
                        image: variant?.media?.edges[0]?.node?.preview?.image?.url || variant?.product?.media?.edges[0]?.node?.preview?.image?.url || "",
                    }
                })
                setSelectedProducts(productPoolData)
            }
        }
    }, [productPoolDataFetcher.data])

    const getUserDiscount = useCallback(async (discountGid: string) => {
        const getUserDiscountData = await GetUserDiscount({
            shopName: globalStore.shop,
            server: globalStore.server,
            discountGid: discountGid,
        })

        if (getUserDiscountData.success) {
            const basic_information = getUserDiscountData.response?.discountData?.basic_information;
            const discount_rules = getUserDiscountData.response?.discountData?.discount_rules;
            const style_config = getUserDiscountData.response?.discountData?.style_config;
            const targeting_settings = {
                ...getUserDiscountData.response?.discountData?.targeting_settings,
                schedule: {
                    startsAt: dayjs(getUserDiscountData.response?.discountData?.targeting_settings?.schedule?.startsAt),
                    endsAt: getUserDiscountData.response?.discountData?.targeting_settings?.schedule?.endsAt ? dayjs(getUserDiscountData.response?.discountData?.targeting_settings?.schedule?.endsAt) : null,
                    hideAfterExpiration: !!getUserDiscountData.response?.discountData?.targeting_settings?.schedule?.hideAfterExpiration,
                }
            };
            const product_pool =
                getUserDiscountData.response?.discountData?.product_pool?.include_variant_ids?.map((item: string) => `gid://shopify/ProductVariant/${item}`);

            productPoolDataFetcher.submit({
                productPoolRequestBody: JSON.stringify({
                    ids: product_pool
                })
            }, { method: 'POST' })
            setBasicInformation(basic_information)
            setTimeout(() => setDiscountRules(discount_rules), 50)
            setStyleConfigData(style_config)
            setTargetingSettingsData(targeting_settings)
            metafieldsRef.current = getUserDiscountData.response?.discountData?.metafields;
        }
    }, [globalStore.shop, globalStore.server])

    const nextStepCheckAndConfirm = () => {
        switch (true) {
            case step == 1:
                if (!basicInformation?.displayName) {
                    shopify.toast.show(t("Offer Name can't be empty"))
                    break;
                }
                setStep(step + 1)
                break;
            case step == 2:
                if (!selectedProducts?.length) {
                    shopify.toast.show(t("Please select at least one product"))
                    break;
                }
                if (!discountRules?.length) {
                    shopify.toast.show(t("Please select at least one discount rule"))
                    break;
                }
                if (discountRules.some(rule => rule.quantity == 0)) {
                    shopify.toast.show(t("Buy quantity can't be 0"))
                    break;
                }
                setStep(step + 1)
                break;
            case step == 3:
                setStep(step + 1)
                break;
            case step == 4:
                if (!targetingSettingsData?.marketVisibilitySettingData.length) {
                    shopify.toast.show(t("Please select at least one market"))
                    break;
                }
                if (!targetingSettingsData?.schedule?.startsAt) {
                    shopify.toast.show(t("Please select start date"))
                    break;
                }
                if (dailyBudgetError) {
                    shopify.toast.show(t("Daily Budget Exceeding"))
                    break;
                }
                handleConfirm();
                break;
            default:
                break;
        }
    }

    const handleConfirm = () => {
        const id = Date.now()

        let newBasicInformation = {
            ...basicInformation,
            offerName: basicInformation?.offerName ? basicInformation?.offerName : `#Bundle ${id}`,
        }

        const selectedProductVariantIds = selectedProducts.map((product) => product.id.split("gid://shopify/ProductVariant/")[1]);

        const metafieldValue = {
            basic_information: newBasicInformation,
            discount_rules: discountRules,
            subscription: subscriptionData,
            progressive_gift: progressiveGiftData,
            style_config: styleConfigData,
            targeting_settings: {
                ...targetingSettingsData,
                schedule: {
                    ...targetingSettingsData?.schedule,
                    startsAt: new Date(targetingSettingsData?.schedule?.startsAt as Date).toISOString(),
                    endsAt: targetingSettingsData?.schedule?.endsAt ? new Date(targetingSettingsData?.schedule?.endsAt).toISOString() : null,
                }
            },
            product_pool: {
                include_product_ids: null,
                include_variant_ids: selectedProductVariantIds,
                include_collection_ids: null,
            }
        }

        if (discountGid) {
            const discountAutomaticAppUpdateAndMetafieldsSetRequestJsondata = {
                id: discountGid,
                automaticAppDiscount: {
                    functionHandle: "ciwi-bundle-multiple-products-discount-function",
                    startsAt: dayjs(targetingSettingsData?.schedule?.startsAt).toISOString(),
                    endsAt: targetingSettingsData?.schedule?.endsAt ? dayjs(targetingSettingsData?.schedule?.endsAt).toISOString() : null,
                    combinesWith: {
                        orderDiscounts: true,
                        productDiscounts: true,
                        shippingDiscounts: true
                    },
                    discountClasses: [
                        "PRODUCT",
                    ]
                },
                metafields: [
                    {
                        key: `basic_information`,
                        namespace: "ciwi_bundles_config",
                        ownerId: discountGid,
                        type: "json",
                        value: JSON.stringify(newBasicInformation)
                    },
                    {
                        key: `discount_rules`,
                        namespace: "ciwi_bundles_config",
                        ownerId: discountGid,
                        type: "json",
                        value: JSON.stringify(discountRules)
                    },
                    {
                        key: `subscription`,
                        namespace: "ciwi_bundles_config",
                        ownerId: discountGid,
                        type: "json",
                        value: JSON.stringify(subscriptionData)
                    },
                    {
                        key: `progressive_gift`,
                        namespace: "ciwi_bundles_config",
                        ownerId: discountGid,
                        type: "json",
                        value: JSON.stringify(progressiveGiftData)
                    },
                    {
                        key: `style_config`,
                        namespace: "ciwi_bundles_config",
                        ownerId: discountGid,
                        type: "json",
                        value: JSON.stringify(styleConfigData)
                    },
                    {
                        key: `targeting_settings`,
                        namespace: "ciwi_bundles_config",
                        ownerId: discountGid,
                        type: "json",
                        value: JSON.stringify({
                            ...targetingSettingsData,
                            startsAt: dayjs(targetingSettingsData?.schedule?.startsAt).toISOString(),
                            endsAt: targetingSettingsData?.schedule?.endsAt ? dayjs(targetingSettingsData?.schedule?.endsAt).toISOString() : null,
                        })
                    },
                    {
                        key: `product_pool`,
                        namespace: "ciwi_bundles_config",
                        ownerId: discountGid,
                        type: "json",
                        value: JSON.stringify({
                            include_product_ids: null,
                            include_variant_ids: selectedProductVariantIds,
                            include_collection_ids: null,
                        })
                    },
                    {
                        ...metafieldsRef.current,
                        type: "json",
                        value: JSON.stringify(metafieldValue)
                    },
                ],
            }

            confirmFetcher.submit({
                discountAutomaticAppUpdateAndMetafieldsSetRequestBody:
                    JSON.stringify({
                        discountAutomaticAppUpdateAndMetafieldsSetRequestJsondata,
                        basic_information: newBasicInformation,
                        discount_rules: discountRules,
                        style_config: styleConfigData,
                        subscription: subscriptionData,
                        progressive_gift: progressiveGiftData,
                        targeting_settings: {
                            ...targetingSettingsData,
                            startsAt: dayjs(targetingSettingsData?.schedule?.startsAt).toISOString(),
                            endsAt: targetingSettingsData?.schedule?.endsAt ? dayjs(targetingSettingsData?.schedule?.endsAt).toISOString() : null,
                        },
                        product_pool: {
                            include_product_ids: null,
                            include_variant_ids: selectedProductVariantIds,
                            include_collection_ids: null,
                        },
                        metafields: {
                            ...metafieldsRef.current,
                            type: "json",
                            value: JSON.stringify(metafieldValue)
                        },
                    }),
            }, { method: "POST" });
        } else {
            const discountAutomaticAppCreateAndMetafieldsSetRequestJsondata = {
                automaticAppDiscount: {
                    title: `#Bundle ${id}`,
                    functionHandle: "ciwi-bundle-multiple-products-discount-function",
                    startsAt: dayjs(targetingSettingsData?.schedule?.startsAt).toISOString(),
                    endsAt: targetingSettingsData?.schedule?.endsAt ? dayjs(targetingSettingsData?.schedule?.endsAt).toISOString() : null,
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
                            value: JSON.stringify(newBasicInformation)
                        },
                        {
                            key: `discount_rules`,
                            namespace: "ciwi_bundles_config",
                            type: "json",
                            value: JSON.stringify(discountRules)
                        },
                        {
                            key: `subscription`,
                            namespace: "ciwi_bundles_config",
                            type: "json",
                            value: JSON.stringify(subscriptionData)
                        },
                        {
                            key: `progressive_gift`,
                            namespace: "ciwi_bundles_config",
                            type: "json",
                            value: JSON.stringify(progressiveGiftData)
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
                                startsAt: dayjs(targetingSettingsData?.schedule?.startsAt).toISOString(),
                                endsAt: targetingSettingsData?.schedule?.endsAt ? dayjs(targetingSettingsData?.schedule?.endsAt).toISOString() : null,
                            })
                        },
                        {
                            key: `product_pool`,
                            namespace: "ciwi_bundles_config",
                            type: "json",
                            value: JSON.stringify({
                                include_product_ids: null,
                                include_variant_ids: selectedProductVariantIds,
                                include_collection_ids: null,
                            })
                        },
                    ],
                    discountClasses: [
                        "PRODUCT",
                    ]
                },
                metafields: [
                    {
                        key: `ciwi_bundles_config_${id}`,
                        namespace: "ciwi_bundles_config",
                        ownerId: "",
                        type: "json",
                        value: JSON.stringify(metafieldValue)
                    },
                ],
            }

            confirmFetcher.submit({
                discountAutomaticAppCreateAndMetafieldsSetRequestBody:
                    JSON.stringify({
                        discountAutomaticAppCreateAndMetafieldsSetRequestJsondata,
                        basic_information: basicInformation,
                        discount_rules: discountRules,
                        subscription: subscriptionData,
                        progressive_gift: progressiveGiftData,
                        style_config: styleConfigData,
                        targeting_settings: {
                            ...targetingSettingsData,
                            startsAt: dayjs(targetingSettingsData?.schedule?.startsAt).toISOString(),
                            endsAt: targetingSettingsData?.schedule?.endsAt ? dayjs(targetingSettingsData?.schedule?.endsAt).toISOString() : null,
                        },
                        product_pool: {
                            include_product_ids: null,
                            include_variant_ids: selectedProductVariantIds,
                            include_collection_ids: null,
                        },
                        metafields: {
                            key: `ciwi_bundles_config_${id}`,
                            namespace: "ciwi_bundles_config",
                            ownerId: "",
                        },
                    }),
            }, { method: "POST" });
        }
    }

    return loading ? (
        <Flex
            align="center"
            justify="center"
            style={{
                height: '100%',
                width: '100%',
            }
            }
        >
            <Spin />
        </Flex >
    )
        :
        (
            <div className="polaris-page">
                <Affix offsetTop={0}>
                    <Header backUrl="/app" title={t(discountGid ? "Edit Offer" : "Create New Offer")} />
                </Affix>

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
                            const isClickable = stepNumber <= step;

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
                        {step === 1 &&
                            <BasicInformationSetting
                                offerTypes={offerTypes}
                                selectedOfferType={selectedOfferType}
                                previewPrice={previewPrice}
                                basicInformation={basicInformation}
                                discountRules={discountRules}
                                styleConfigData={styleConfigData}
                                selectedRuleIndex={selectedRuleIndex}
                                setSelectedRuleIndex={setSelectedRuleIndex}
                                setBasicInformation={setBasicInformation}
                            />
                        }

                        {step === 2 && (
                            <>
                                {/* Product Modal */}
                                <ProductModal
                                    mainModalType={mainModalType}
                                    setMainModalType={setMainModalType}
                                    selectedProducts={selectedProducts}
                                    setSelectedProducts={setSelectedProducts}
                                />

                                {/* EditProduct Modal */}
                                <EditProductModal
                                    mainModalType={mainModalType}
                                    setMainModalType={setMainModalType}
                                    selectedProducts={selectedProducts}
                                    setSelectedProducts={setSelectedProducts}
                                />

                                <ProductsAndDiscountsSetting
                                    previewPrice={previewPrice}
                                    selectedProducts={selectedProducts}
                                    setMainModalType={setMainModalType}
                                    basicInformation={basicInformation}
                                    discountRules={discountRules}
                                    styleConfigData={styleConfigData}
                                    setDiscountRules={setDiscountRules}
                                    selectedRuleIndex={selectedRuleIndex}
                                    setSelectedRuleIndex={setSelectedRuleIndex}
                                />
                            </>
                        )}

                        {step === 3 && (
                            <StyleDesignSetting
                                previewPrice={previewPrice}
                                styleConfigData={styleConfigData}
                                setStyleConfigData={setStyleConfigData}
                                discountRules={discountRules}
                                selectedOfferType={selectedOfferType}
                                selectedRuleIndex={selectedRuleIndex}
                                setSelectedRuleIndex={setSelectedRuleIndex}
                            />
                        )}

                        {step === 4 && (
                            <ScheduleAndBudgetSetting
                                targetingSettingsData={targetingSettingsData}
                                setTargetingSettingsData={setTargetingSettingsData}
                                dailyBudgetError={dailyBudgetError}
                                marketVisibilitySettingData={marketVisibilitySettingData}
                            />
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
                        <Button
                            onClick={() => setStep(step - 1)}
                        >
                            Previous
                        </Button>
                    )}
                    <Button
                        className="polaris-button"
                        loading={confirmFetcher.state === "submitting"}
                        onClick={
                            () => nextStepCheckAndConfirm()
                        }
                    >
                        {step === 4 ? t(discountGid ? "Save Offer" : "Create Offer") : 'Next'}
                    </Button>
                </div>
            </div>
        )
};

export default Index;