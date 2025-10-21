// import { TitleBar } from "@shopify/app-bridge-react";
// import { Page } from "@shopify/polaris";
// import {
//   Space,
//   Row,
//   Col,
//   Card,
//   Progress,
//   Button,
//   Typography,
//   Alert,
//   Skeleton,
//   Popover,
//   Badge,
//   Flex,
//   Switch,
//   Table,
//   Collapse,
//   Modal,
//   CollapseProps,
//   Grid,
// } from "antd";
// import { useTranslation } from "react-i18next";
// import { useEffect, useMemo, useState } from "react";
// import ScrollNotice from "~/components/ScrollNotice";
// import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
// import { GetLatestActiveSubscribeId } from "~/api/JavaServer";
// import { authenticate } from "~/shopify.server";
// import { useFetcher, useLoaderData } from "@remix-run/react";
// import { OptionType } from "~/components/paymentModal";
// import { CheckOutlined, QuestionCircleOutlined } from "@ant-design/icons";
// import "./style.css";
// import {
//   mutationAppPurchaseOneTimeCreate,
//   mutationAppSubscriptionCreate,
// } from "~/api/admin";
// import { useDispatch, useSelector } from "react-redux";
// import { handleContactSupport } from "../app._index/route";
// import { setPlan, setUpdateTime } from "~/store/modules/userConfig";
// import useReport from "scripts/eventReport";
// import HasPayForFreePlanModal from "./components/hasPayForFreePlanModal";
// import { globalStore } from "~/globalStore";
// const { Title, Text, Paragraph } = Typography;

// export const action = async ({ request }: ActionFunctionArgs) => {
//   const adminAuthResult = await authenticate.admin(request);
//   const { shop, accessToken } = adminAuthResult.session;
//   const { admin } = adminAuthResult;

//   const formData = await request.formData();
//   const payInfo = JSON.parse(formData.get("payInfo") as string);
//   const payForPlan = JSON.parse(formData.get("payForPlan") as string);
//   const cancelId = JSON.parse(formData.get("cancelId") as string);
//   switch (true) {
//     case !!payInfo:
//       try {
//         const returnUrl = new URL(
//           `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/${process.env.HANDLE}/app/pricing`,
//         );
//         const res = await mutationAppPurchaseOneTimeCreate({
//           shop,
//           accessToken: accessToken as string,
//           name: payInfo.name,
//           price: payInfo.price,
//           returnUrl,
//           test:
//             process.env.NODE_ENV === "development" ||
//             process.env.NODE_ENV === "test",
//         });
//         return {
//           success: true,
//           errorCode: 0,
//           errorMsg: "",
//           response: res?.data,
//         };
//       } catch (error) {
//         console.error("Error payInfo app:", error);
//         return {
//           success: false,
//           errorCode: 10001,
//           errorMsg: "SERVER_ERROR",
//           response: undefined,
//         };
//       }

//     case !!payForPlan:
//       try {
//         const returnUrl = new URL(
//           `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/${process.env.HANDLE}/app/pricing`,
//         );
//         const res = await mutationAppSubscriptionCreate({
//           shop,
//           accessToken: accessToken as string,
//           name: payForPlan.title,
//           yearly: payForPlan.yearly,
//           price: {
//             amount: payForPlan.yearly
//               ? payForPlan.yearlyPrice * 12
//               : payForPlan.monthlyPrice,
//             currencyCode: "USD",
//           },
//           trialDays: payForPlan.trialDays,
//           returnUrl,
//           test:
//             process.env.NODE_ENV === "development" ||
//             process.env.NODE_ENV === "test",
//         });

//         return {
//           success: true,
//           errorCode: 0,
//           errorMsg: "",
//           response: {
//             ...res,
//             appSubscription: {
//               ...res.appSubscription,
//               price: {
//                 amount: payForPlan.yearly
//                   ? payForPlan.yearlyPrice
//                   : payForPlan.monthlyPrice,
//                 currencyCode: "USD",
//               },
//             },
//           },
//         };
//       } catch (error) {
//         console.error("Error payForPlan action:", error);
//         return {
//           success: false,
//           errorCode: 10001,
//           errorMsg: "SERVER_ERROR",
//           response: undefined,
//         };
//       }
//     case !!cancelId:
//       try {
//         const response = await admin.graphql(
//           `#graphql
//           mutation AppSubscriptionCancel($id: ID!, $prorate: Boolean) {
//             appSubscriptionCancel(id: $id, prorate: $prorate) {
//               userErrors {
//                 field
//                 message
//               }
//               appSubscription {
//                 id
//                 status
//               }
//             }
//           }`,
//           {
//             variables: {
//               id: cancelId,
//             },
//           },
//         );

//         const data = await response.json();
//         console.log(`应用日志: ${shop} 取消计划: `, data);
//         return data;
//       } catch (error) {
//         console.error("Error cancelId action:", error);
//       }
//   }
//   return null;
// };

// const Index = () => {
//   const { plan, updateTime, chars, totalChars, isNew } = useSelector(
//     (state: any) => state.userConfig,
//   );
//   const { reportClick, report } = useReport();
//   const creditOptions: OptionType[] = useMemo(
//     () => [
//       {
//         key: "option-1",
//         name: "500K",
//         Credits: 500000,
//         price: {
//           currentPrice:
//             plan.id === 6
//               ? 1.99
//               : plan.id === 5
//                 ? 2.99
//                 : plan.id === 4
//                   ? 3.59
//                   : 3.99,
//           comparedPrice: 3.99,
//           currencyCode: "USD",
//         },
//       },
//       {
//         key: "option-2",
//         name: "1M",
//         Credits: 1000000,
//         price: {
//           currentPrice:
//             plan.id === 6
//               ? 3.99
//               : plan.id === 5
//                 ? 5.99
//                 : plan.id === 4
//                   ? 7.19
//                   : 7.99,
//           comparedPrice: 7.99,
//           currencyCode: "USD",
//         },
//       },
//       {
//         key: "option-3",
//         name: "2M",
//         Credits: 2000000,
//         price: {
//           currentPrice:
//             plan.id === 6
//               ? 7.99
//               : plan.id === 5
//                 ? 11.99
//                 : plan.id === 4
//                   ? 14.39
//                   : 15.99,
//           comparedPrice: 15.99,
//           currencyCode: "USD",
//         },
//       },
//       {
//         key: "option-4",
//         name: "3M",
//         Credits: 3000000,
//         price: {
//           currentPrice:
//             plan.id === 6
//               ? 11.99
//               : plan.id === 5
//                 ? 17.99
//                 : plan.id === 4
//                   ? 21.79
//                   : 23.99,
//           comparedPrice: 23.99,
//           currencyCode: "USD",
//         },
//       },
//       {
//         key: "option-5",
//         name: "5M",
//         Credits: 5000000,
//         price: {
//           currentPrice:
//             plan.id === 6
//               ? 19.99
//               : plan.id === 5
//                 ? 29.99
//                 : plan.id === 4
//                   ? 35.99
//                   : 39.99,
//           comparedPrice: 39.99,
//           currencyCode: "USD",
//         },
//       },
//       {
//         key: "option-6",
//         name: "10M",
//         Credits: 10000000,
//         price: {
//           currentPrice:
//             plan.id === 6
//               ? 39.99
//               : plan.id === 5
//                 ? 59.99
//                 : plan.id === 4
//                   ? 71.99
//                   : 79.99,
//           comparedPrice: 79.99,
//           currencyCode: "USD",
//         },
//       },
//       {
//         key: "option-7",
//         name: "20M",
//         Credits: 20000000,
//         price: {
//           currentPrice:
//             plan.id === 6
//               ? 79.99
//               : plan.id === 5
//                 ? 119.99
//                 : plan.id === 4
//                   ? 143.99
//                   : 159.99,
//           comparedPrice: 159.99,
//           currencyCode: "USD",
//         },
//       },
//       {
//         key: "option-8",
//         name: "30M",
//         Credits: 30000000,
//         price: {
//           currentPrice:
//             plan.id === 6
//               ? 119.99
//               : plan.id === 5
//                 ? 179.99
//                 : plan.id === 4
//                   ? 215.99
//                   : 239.99,
//           comparedPrice: 239.99,
//           currencyCode: "USD",
//         },
//       },
//     ],
//     [plan],
//   );
//   const [yearly, setYearly] = useState(false);
//   const [selectedOptionKey, setSelectedOption] = useState<string>("option-1");
//   const [isLoading, setIsLoading] = useState(true);
//   const [addCreditsModalOpen, setAddCreditsModalOpen] = useState(false);
//   const [cancelPlanWarnModal, setCancelPlanWarnModal] = useState(false);
//   const [buyButtonLoading, setBuyButtonLoading] = useState<boolean>(false);
//   const [payForPlanButtonLoading, setPayForPlanButtonLoading] =
//     useState<string>("");
//   const [selectedPayPlanOption, setSelectedPayPlanOption] = useState<any>();
//   const isQuotaExceeded = useMemo(
//     () => chars >= totalChars && totalChars > 0,
//     [chars, totalChars],
//   );
//   const { t } = useTranslation();
//   const dispatch = useDispatch();

//   const fetcher = useFetcher<any>();
//   const planCancelFetcher = useFetcher<any>();
//   const payFetcher = useFetcher<any>();
//   const orderFetcher = useFetcher<any>();
//   const payForPlanFetcher = useFetcher<any>();
//   const [isModalVisible, setIsModalVisible] = useState(false);

//   const handleCancel = () => {
//     setIsModalVisible(false);
//   };
//   const { useBreakpoint } = Grid;
//   const screens = useBreakpoint(); // 监听屏幕断点
//   const handleSetYearlyReport = () => {
//     setYearly(!yearly);
//     report(
//       {
//         status: yearly ? 0 : 1,
//       },
//       {
//         action: "/app",
//         method: "post",
//         eventType: "click",
//       },
//       "pricing_plan_yearly_switcher",
//     );
//   };

//   useEffect(() => {
//     setIsLoading(false);
//     fetcher.submit(
//       {
//         log: `${globalStore?.shop} 目前在付费页面`,
//       },
//       {
//         method: "POST",
//         action: "/log",
//       },
//     );
//   }, []);

//   useEffect(() => {
//     if (payFetcher.data) {
//       if (payFetcher.data?.success) {
//         const order =
//           payFetcher.data?.response?.appPurchaseOneTimeCreate
//             ?.appPurchaseOneTime;
//         const confirmationUrl =
//           payFetcher.data?.response?.appPurchaseOneTimeCreate?.confirmationUrl;
//         const orderInfo = {
//           id: order.id,
//           amount: order.price.amount,
//           name: order.name,
//           createdAt: order.createdAt,
//           status: order.status,
//           confirmationUrl: confirmationUrl,
//         };
//         const formData = new FormData();
//         formData.append("orderInfo", JSON.stringify(orderInfo));
//         orderFetcher.submit(formData, {
//           method: "post",
//           action: "/app",
//         });
//         open(confirmationUrl, "_top");
//       } else {
//         setBuyButtonLoading(false);
//       }
//     }
//   }, [payFetcher.data]);

//   useEffect(() => {
//     if (payForPlanFetcher.data) {
//       if (payForPlanFetcher.data?.success) {
//         const order = payForPlanFetcher.data?.response?.appSubscription;
//         const confirmationUrl =
//           payForPlanFetcher.data?.response?.confirmationUrl;
//         const orderInfo = {
//           id: order.id,
//           amount: order.price.amount,
//           name: order.name,
//           createdAt: order.createdAt,
//           status: order.status,
//           confirmationUrl: confirmationUrl,
//         };
//         const formData = new FormData();
//         formData.append("orderInfo", JSON.stringify(orderInfo));
//         orderFetcher.submit(formData, {
//           method: "post",
//           action: "/app",
//         });
//         open(confirmationUrl, "_top");
//       } else {
//         setPayForPlanButtonLoading("");
//       }
//     }
//   }, [payForPlanFetcher.data]);

//   useEffect(() => {
//     if (planCancelFetcher.data) {
//       dispatch(
//         setPlan({
//           plan: {
//             id: 2,
//             feeType: 0,
//           },
//         }),
//       );
//       dispatch(setUpdateTime({ updateTime: "" }));
//       setCancelPlanWarnModal(false);
//     }
//   }, [planCancelFetcher.data]);

//   const plans = useMemo(
//     () => [
//       {
//         title: "Basic",
//         yearlyTitle: "Basic - Yearly",
//         monthlyPrice: 7.99,
//         yearlyPrice: 6.39,
//         subtitle: t("<strong>${{amount}}</strong> billed once a year", {
//           amount: 76.68,
//         }),
//         buttonText:
//           plan.id === 4 && yearly === !!(plan.feeType === 2)
//             ? t("pricing.current_plan")
//             : t("pricing.get_start"),
//         buttonType: "default",
//         disabled: plan.id === 4 && yearly === !!(plan.feeType === 2),
//         features: [
//           t("{{credits}} credits/month", { credits: "1,500,000" }),
//           t("Glossary ({{count}} entries)", { count: 10 }),
//           t("basic_features1"),
//           t("basic_features2"),
//           t("basic_features3"),
//           t("basic_features4"),
//           t("basic_features5"),
//           t("basic_features6"),
//           t("basic_features7"),
//           t("basic_features8"),
//           t("basic_features9"),
//         ],
//       },
//       {
//         title: "Pro",
//         yearlyTitle: "Pro - Yearly",
//         monthlyPrice: 19.99,
//         yearlyPrice: 15.99,
//         subtitle: t("<strong>${{amount}}</strong> billed once a year", {
//           amount: 191.88,
//         }),
//         buttonText:
//           plan.id === 5 && yearly === !!(plan.feeType === 2)
//             ? t("pricing.current_plan")
//             : t("pricing.get_start"),
//         buttonType: "default",
//         disabled: plan.id === 5 && yearly === !!(plan.feeType === 2),
//         features: [
//           t("all in Basic Plan"),
//           t("{{credits}} credits/month", { credits: "3,000,000" }),
//           t("Glossary ({{count}} entries)", { count: 50 }),
//           t("pro_features1"),
//           t("pro_features2"),
//           t("pro_features3"),
//           t("pro_features4"),
//           t("pro_features5"),
//           t("pro_features6"),
//           t("pro_features7"),
//           t("pro_features8"),
//         ],
//       },
//       {
//         title: "Premium",
//         yearlyTitle: "Premium - Yearly",
//         monthlyPrice: 39.99,
//         yearlyPrice: 31.99,
//         subtitle: t("<strong>${{amount}}</strong> billed once a year", {
//           amount: 383.88,
//         }),
//         buttonText:
//           plan.id === 6 && yearly === !!(plan.feeType === 2)
//             ? t("pricing.current_plan")
//             : t("pricing.get_start"),
//         disabled: plan.id === 6 && yearly === !!(plan.feeType === 2),
//         isRecommended: true,
//         features: [
//           t("all in Pro Plan"),
//           t("{{credits}} credits/month", { credits: "8,000,000" }),
//           t("Glossary ({{count}} entries)", { count: 100 }),
//           t("premium_features1"),
//           t("premium_features2"),
//           t("premium_features3"),
//           t("premium_features4"),
//           t("premium_features5"),
//           t("premium_features6"),
//           t("premium_features7"),
//           t("premium_features8"),
//           t("premium_features9"),
//         ],
//       },
//     ],
//     [plan, yearly],
//   );

//   const tableData = useMemo(
//     () => [
//       {
//         key: 0,
//         features: t("Monthly Payment"),
//         free: "0",
//         basic: "7.99",
//         pro: "19.99",
//         premium: "39.99",
//         type: "text",
//       },
//       {
//         key: 1,
//         features: t("Annual payment discount"),
//         free: "",
//         basic: "20%",
//         pro: "20%",
//         premium: "20%",
//         type: "text",
//       },
//       {
//         key: 2,
//         features: t("Monthly payment after discount"),
//         free: "",
//         basic: "6.39",
//         pro: "15.99",
//         premium: "31.99",
//         type: "text",
//       },
//       {
//         key: 3,
//         features: t("Annual payment after discount"),
//         free: "",
//         basic: "76.68",
//         pro: "191.88",
//         premium: "383.88",
//         type: "text",
//       },
//       {
//         key: 4,
//         features: t("Monthly points gift"),
//         free: "0",
//         basic: t("{{credits}} credits/month", { credits: "1,500,000" }),
//         pro: t("{{credits}} credits/month", { credits: "3,000,000" }),
//         premium: t("{{credits}} credits/month", { credits: "8,000,000" }),
//         type: "text",
//       },
//       {
//         key: 5,
//         features: t("Glossary"),
//         free: "",
//         basic: "10",
//         pro: "50",
//         premium: "100",
//         type: "text",
//       },
//       {
//         key: 6,
//         features: t("Points purchase discount"),
//         free: "0%",
//         basic: "10%",
//         pro: "25%",
//         premium: "50%",
//         type: "text",
//       },
//       {
//         key: 7,
//         features: t("Automatic translation updates"),
//         free: "",
//         basic: t("support"),
//         pro: t("support"),
//         premium: t("support"),
//         type: "text",
//       },
//       {
//         key: 8,
//         features: t("Manual Editor"),
//         free: t("support"),
//         basic: t("support"),
//         pro: t("support"),
//         premium: t("support"),
//         type: "text",
//       },
//       {
//         key: 9,
//         features: t("Automatic IP switching"),
//         free: "",
//         basic: t("support"),
//         pro: t("support"),
//         premium: t("support"),
//         type: "text",
//       },
//       {
//         key: 10,
//         features: t("IP call limit"),
//         free: "",
//         basic: "10,000",
//         pro: "25,000",
//         premium: "50,000",
//         type: "text",
//       },
//       {
//         key: 11,
//         features: t("Third-party app translation"),
//         free: "",
//         basic: t("support"),
//         pro: t("support"),
//         premium: t("support"),
//         type: "text",
//       },
//       {
//         key: 12,
//         features: t("Image Translation"),
//         free: "",
//         basic: t("support"),
//         pro: t("support"),
//         premium: t("support"),
//         type: "text",
//       },
//       {
//         key: 13,
//         features: t("Private API support"),
//         free: t("support"),
//         basic: t("support"),
//         pro: t("support"),
//         premium: t("support"),
//         type: "text",
//       },
//       {
//         key: 14,
//         features: t("Private API call limits"),
//         free: "30,000",
//         basic: "300,000",
//         pro: "800,000",
//         premium: "3,000,000",
//         type: "text",
//       },
//       {
//         key: 15,
//         features: t("Manual support"),
//         free: "",
//         basic: t("support"),
//         pro: t("support"),
//         premium: t("1v1 support"),
//         type: "text",
//       },
//     ],
//     [],
//   );

//   const collapseData: CollapseProps["items"] = useMemo(
//     () => [
//       {
//         key: 0,
//         label: t("How does the 5-day free trial work?"),
//         children: t(
//           "Choosing Pro or Premium gives you 5 days of full access to all features, along with 200,000 trial credits. Cancel anytime before the trial ends to avoid billing.",
//         ),
//       },
//       {
//         key: 1,
//         label: t("Can I get a discount on my plan?"),
//         children: t(
//           "Yes. You'll save 20% when you choose yearly billing. Discount applies automatically at checkout.",
//         ),
//       },
//       {
//         key: 2,
//         label: t("Can I get a refund?"),
//         children: t(
//           "No. We do not offer refunds. You can cancel anytime to stop future billing, and your plan will remain active until the end of the billing period.",
//         ),
//       },
//       {
//         key: 3,
//         label: t("What happens when I run out of credits?"),
//         children: t(
//           "You'll need to purchase extra credits to keep creating content. You won't lose access to features, only to credit-based actions.",
//         ),
//       },
//       {
//         key: 4,
//         label: t("Do unused credits carry over?"),
//         children: t(
//           "Plan credits reset at the end of each billing cycle. But if you cancel or downgrade, any unused credits stay active for 3 more months.",
//         ),
//       },
//       {
//         key: 5,
//         label: t("Do extra credits affect my plan or features?"),
//         children: t(
//           "No. Plan credits come with your subscription and reset monthly. Extra credits are only used when plan credits run out, and they never expire. They don't unlock new features or raise limits.",
//         ),
//       },
//       {
//         key: 6,
//         label: t("What happens if I upgrade my plan?"),
//         children: t(
//           "You get your new plan's credits and features right away. Any remaining credits from your previous plan won't carry over.",
//         ),
//       },
//       {
//         key: 7,
//         label: t("Will I lose credits if I cancel or downgrade?"),
//         children: t(
//           "No. Your unused credits stay available for 3 months. But you'll only have access to the features included in your new (lower) plan.",
//         ),
//       },
//       {
//         key: 8,
//         label: t("How many credits do actions use?"),
//         children: t(
//           "We calculate usage at 1 credit per word. However, if AI model is used, the consumption of prompt tokens also needs to be included—each request requires approximately an additional 80 credits. If you would like to know the estimated cost of a translation task, please feel free to contact customer support.",
//         ),
//       },
//     ],
//     [],
//   );

//   const columns = [
//     {
//       title: t("Features"),
//       dataIndex: "features",
//       key: "features",
//     },
//     {
//       title: "Free",
//       dataIndex: "free",
//       key: "free",
//       render: (_: any, record: any) => {
//         switch (true) {
//           case record.type === "credits":
//             return <Text>{record.free}</Text>;
//           case record.type === "boolean":
//             return <Text>{record.free ? "√" : "×"}</Text>;
//           default:
//             return <Text>{record.free}</Text>;
//         }
//       },
//     },
//     {
//       title: "Basic",
//       dataIndex: "basic",
//       key: "basic",
//       render: (_: any, record: any) => {
//         switch (true) {
//           case record.type === "credits":
//             return <Text>{record.basic}</Text>;
//           case record.type === "boolean":
//             return <Text>{record.basic ? "√" : "×"}</Text>;
//           default:
//             return <Text>{record.basic}</Text>;
//         }
//       },
//     },
//     {
//       title: "Pro",
//       dataIndex: "pro",
//       key: "pro",
//       render: (_: any, record: any) => {
//         switch (true) {
//           case record.type === "credits":
//             return <Text>{record.pro}</Text>;
//           case record.type === "boolean":
//             return <Text>{record.pro ? "√" : "×"}</Text>;
//           default:
//             return <Text>{record.pro}</Text>;
//         }
//       },
//     },
//     {
//       title: "Premium",
//       dataIndex: "premium",
//       key: "premium",
//       render: (_: any, record: any) => {
//         switch (true) {
//           case record.type === "credits":
//             return <Text>{record.premium}</Text>;
//           case record.type === "boolean":
//             return <Text>{record.premium ? "√" : "×"}</Text>;
//           default:
//             return <Text>{record.premium}</Text>;
//         }
//       },
//     },
//   ];

//   const handlePay = () => {
//     setBuyButtonLoading(true);
//     const selectedOption = creditOptions.find(
//       (item) => item.key === selectedOptionKey,
//     );

//     const payInfo = {
//       name: selectedOption?.name,
//       price: {
//         amount: selectedOption?.price.currentPrice,
//         currencyCode: selectedOption?.price.currencyCode,
//       },
//     };
//     const formData = new FormData();
//     formData.append("payInfo", JSON.stringify(payInfo));
//     payFetcher.submit(formData, {
//       method: "POST",
//     });
//   };

//   const handleCancelPlan = async () => {
//     const data = await GetLatestActiveSubscribeId({
//       shop: globalStore?.shop as string,
//       server: globalStore?.server as string,
//     });
//     if (data.success) {
//       planCancelFetcher.submit(
//         {
//           cancelId: JSON.stringify(data.response),
//         },
//         { method: "POST" },
//       );
//     }
//   };

//   const handlePayForPlan = ({
//     plan,
//     trialDays,
//     id,
//   }: {
//     plan: any;
//     trialDays: number;
//     id: string;
//   }) => {
//     setPayForPlanButtonLoading(id);
//     setSelectedPayPlanOption({ ...plan, yearly, trialDays });
//     payForPlanFetcher.submit(
//       { payForPlan: JSON.stringify({ ...plan, yearly, trialDays }) },
//       { method: "POST" },
//     );
//     reportClick(trialDays !== 5 ? "pricing_plan_start" : "pricing_plan_trial");
//   };

//   return (
//     <Page>
//       <TitleBar title={t("Pricing")} />
//       <ScrollNotice
//         text={t(
//           "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
//         )}
//       />
//       <Space direction="vertical" size="large" style={{ display: "flex" }}>
//         {/* 积分余额显示 */}
//         <Card loading={isLoading}>
//           <Space direction="vertical" size="small" style={{ width: "100%" }}>
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "space-between",
//               }}
//             >
//               <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
//                 <Title level={4} style={{ marginBottom: 0 }}>
//                   {t("Your translation quota")}
//                 </Title>
//                 <Popover
//                   content={t(
//                     "Permanent quotas · Never expire · Top up anytime.",
//                   )}
//                 >
//                   <QuestionCircleOutlined />
//                 </Popover>
//                 <Button
//                   type="primary"
//                   onClick={() => {
//                     setAddCreditsModalOpen(true);
//                     reportClick("pricing_balance_add");
//                   }}
//                 >
//                   {t("Add credits")}
//                 </Button>
//               </div>
//               {plan && (
//                 <div>
//                   <Text>{t("Current plan: ")}</Text>
//                   <Text style={{ color: "#007F61", fontWeight: "bold" }}>
//                     {plan.id === 3
//                       ? "Starter"
//                       : plan.id === 4
//                         ? "Basic"
//                         : plan.id === 5
//                           ? "Pro"
//                           : plan.id === 6
//                             ? "Premium"
//                             : plan.id === 7
//                               ? "Free Trial"
//                               : "Free"}{" "}
//                     {t("plan")}
//                   </Text>
//                 </div>
//               )}
//             </div>
//             <div
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "space-between",
//               }}
//             >
//               {chars !== undefined && totalChars !== undefined && (
//                 <div
//                   dangerouslySetInnerHTML={{
//                     __html: t(
//                       "{{currentCredits}} has been used, total credits: {{maxCredits}}.",
//                       {
//                         currentCredits: chars?.toLocaleString() || 0,
//                         maxCredits: totalChars?.toLocaleString() || 0,
//                       },
//                     ),
//                   }}
//                 />
//               )}
//               <Text
//                 style={{
//                   display: updateTime && totalChars ? "block" : "none",
//                 }}
//               >
//                 {t("This bill was issued on {{date}}", { date: updateTime })}
//               </Text>
//             </div>
//             <Progress
//               percent={
//                 totalChars == 0 ? 100 : Math.round((chars / totalChars) * 100)
//               }
//               size={["100%", 15]}
//               strokeColor="#007F61"
//               showInfo={false}
//             />
//           </Space>
//         </Card>
//         {isQuotaExceeded && (
//           <Alert
//             message={t("The quota has been used up")}
//             description={t("Buy extra credits now to continue using")}
//             type="warning"
//             showIcon
//           />
//         )}
//         <Flex vertical align="center" style={{ width: "100%" }}>
//           <Title level={3} style={{ fontWeight: 700 }}>
//             {t("Choose the right plan for you")}
//           </Title>
//           <Row style={{ width: "100%" }}>
//             <Col
//               span={screens.xs ? 16 : 18}
//               style={{
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: screens.xs ? "left" : "center",
//                 left: screens.xs ? "0" : "50%",
//                 transform: screens.xs ? "translateX(0)" : "translateX(-50%)",
//               }}
//             >
//               <Flex align="center">
//                 <Space align="center" size="small">
//                   <Switch checked={yearly} onChange={handleSetYearlyReport} />
//                   <Text>{t("Yearly")}</Text>
//                 </Space>
//                 <div className="yearly_save">
//                   <Text strong>{t("Save 20%")}</Text>
//                 </div>
//               </Flex>
//             </Col>
//             <Col
//               span={screens.xs ? 8 : 6}
//               style={{ textAlign: screens.xs ? "center" : "right" }}
//             >
//               {isLoading ? (
//                 <Skeleton.Button active />
//               ) : (
//                 <Button
//                   style={{ right: 0 }}
//                   type="primary"
//                   size="middle"
//                   onClick={() => {
//                     setIsModalVisible(true);
//                   }}
//                 >
//                   {t("Shared Plan")}
//                 </Button>
//               )}
//             </Col>
//           </Row>
//         </Flex>
//         <Row gutter={[16, 16]}>
//           <Col
//             key={t("Free")}
//             xs={24}
//             sm={24}
//             md={12}
//             lg={6}
//             style={{
//               display: "flex",
//               width: "100%",
//             }}
//           >
//             <Card
//               hoverable
//               style={{
//                 flex: 1,
//                 height: "100%",
//                 display: "flex",
//                 flexDirection: "column",
//                 position: "relative",
//                 borderColor:
//                   plan.id === 1 || plan.id === 2 ? "#007F61" : undefined,
//                 minWidth: "220px",
//               }}
//               styles={{
//                 body: {
//                   flex: 1,
//                   display: "flex",
//                   flexDirection: "column",
//                   padding: "16px",
//                 },
//               }}
//               loading={!plan.id}
//             >
//               <Title level={5}>Free</Title>
//               <div style={{ margin: yearly ? "12px 0 46px 0" : "12px  0" }}>
//                 <Text style={{ fontSize: "28px", fontWeight: "bold" }}>$0</Text>
//                 <Text style={{ fontSize: "14px" }}>{t("/month")}</Text>
//               </div>

//               <Button
//                 type="default"
//                 block
//                 disabled={
//                   plan.id === 1 || plan.id === 2 || selectedPayPlanOption
//                 }
//                 style={{ marginBottom: isNew ? "20px" : "70px" }}
//                 onClick={() => {
//                   setCancelPlanWarnModal(true);
//                   reportClick("pricing_plan_trial");
//                 }}
//               >
//                 {plan.id === 1 || plan.id === 2
//                   ? t("pricing.current_plan")
//                   : t("pricing.get_start")}
//               </Button>
//               <div style={{ flex: 1 }}>
//                 <div
//                   key={0}
//                   style={{
//                     marginBottom: "8px",
//                     display: "flex",
//                     alignItems: "flex-start",
//                     gap: "6px",
//                   }}
//                 >
//                   <CheckOutlined
//                     style={{
//                       color: "#52c41a",
//                       fontSize: "12px",
//                     }}
//                   />
//                   <Text style={{ fontSize: "13px" }}>
//                     {t("starter_features1")}
//                   </Text>
//                 </div>
//                 <div
//                   key={1}
//                   style={{
//                     marginBottom: "8px",
//                     display: "flex",
//                     alignItems: "flex-start",
//                     gap: "6px",
//                   }}
//                 >
//                   <CheckOutlined
//                     style={{
//                       color: "#52c41a",
//                       fontSize: "12px",
//                     }}
//                   />
//                   <Text style={{ fontSize: "13px" }}>
//                     {t("starter_features2")}
//                   </Text>
//                 </div>
//                 <div
//                   key={2}
//                   style={{
//                     marginBottom: "8px",
//                     display: "flex",
//                     alignItems: "flex-start",
//                     gap: "6px",
//                   }}
//                 >
//                   <CheckOutlined
//                     style={{
//                       color: "#52c41a",
//                       fontSize: "12px",
//                     }}
//                   />
//                   <Text style={{ fontSize: "13px" }}>
//                     {t("starter_features3")}
//                   </Text>
//                 </div>
//               </div>
//             </Card>
//           </Col>
//           {plans.map((item, index) => (
//             <Col
//               key={item.title}
//               xs={24}
//               sm={24}
//               md={12}
//               lg={6}
//               style={{
//                 display: "flex",
//                 width: "100%",
//               }}
//             >
//               <Badge.Ribbon
//                 text={t("pricing.recommended")}
//                 color="#1890ff"
//                 style={{
//                   display:
//                     item.isRecommended && plan.id <= 2 && plan.id
//                       ? "block"
//                       : "none",
//                   right: -8,
//                 }}
//               >
//                 <Card
//                   hoverable
//                   style={{
//                     flex: 1,
//                     height: "100%",
//                     display: "flex",
//                     flexDirection: "column",
//                     position: "relative",
//                     borderColor: item.disabled
//                       ? "#007F61"
//                       : item.isRecommended && plan.id <= 2 && plan.id
//                         ? "#1890ff"
//                         : undefined,
//                     minWidth: "220px",
//                   }}
//                   styles={{
//                     body: {
//                       flex: 1,
//                       display: "flex",
//                       flexDirection: "column",
//                       padding: "16px",
//                     },
//                   }}
//                   loading={!plan.id}
//                 >
//                   <Title level={5}>
//                     {yearly ? item.yearlyTitle : item.title}
//                   </Title>
//                   <div style={{ margin: "12px 0" }}>
//                     <Text style={{ fontSize: "28px", fontWeight: "bold" }}>
//                       ${yearly ? item.yearlyPrice : item.monthlyPrice}
//                     </Text>
//                     <Text style={{ fontSize: "14px" }}>{t("/month")}</Text>
//                   </div>
//                   {yearly && (
//                     <div
//                       dangerouslySetInnerHTML={{ __html: item.subtitle }}
//                       style={{ marginBottom: "12px" }}
//                     />
//                   )}
//                   <Button
//                     id={`${item.title}-${yearly ? "yearly" : "month"}-${index}-0`}
//                     type="default"
//                     block
//                     disabled={item.disabled || selectedPayPlanOption}
//                     style={{ marginBottom: "20px" }}
//                     onClick={() =>
//                       handlePayForPlan({
//                         plan: item,
//                         trialDays: 0,
//                         id: `${item.title}-${yearly ? "yearly" : "month"}-${index}-0`,
//                       })
//                     }
//                     loading={
//                       payForPlanButtonLoading ==
//                       `${item.title}-${yearly ? "yearly" : "month"}-${index}-0`
//                     }
//                   >
//                     {item.buttonText}
//                   </Button>
//                   {isNew && (
//                     <Button
//                       id={`${item.title}-${yearly ? "yearly" : "month"}-${index}-5`}
//                       type="primary"
//                       block
//                       disabled={item.disabled || selectedPayPlanOption}
//                       style={{ marginBottom: "20px" }}
//                       onClick={() =>
//                         handlePayForPlan({
//                           plan: item,
//                           trialDays: 5,
//                           id: `${item.title}-${yearly ? "yearly" : "month"}-${index}-5`,
//                         })
//                       }
//                       loading={
//                         payForPlanButtonLoading ==
//                         `${item.title}-${yearly ? "yearly" : "month"}-${index}-5`
//                       }
//                     >
//                       {t("Free trial")}
//                     </Button>
//                   )}
//                   <div style={{ flex: 1 }}>
//                     {item.features.map((feature, idx) => (
//                       <div
//                         key={idx}
//                         style={{
//                           marginBottom: "8px",
//                           display: "flex",
//                           alignItems: "flex-start",
//                           gap: "6px",
//                         }}
//                       >
//                         <CheckOutlined
//                           style={{
//                             color: "#52c41a",
//                             fontSize: "12px",
//                           }}
//                         />
//                         <Text style={{ fontSize: "13px" }}>{feature}</Text>
//                       </div>
//                     ))}
//                   </div>
//                 </Card>
//               </Badge.Ribbon>
//             </Col>
//           ))}
//         </Row>
//         <Space
//           direction="vertical"
//           size="small"
//           style={{
//             display: "flex",
//           }}
//         >
//           <Title
//             level={3}
//             style={{
//               fontWeight: 700,
//               textAlign: "center",
//             }}
//           >
//             {t("Compare plans")}
//           </Title>
//           <Table
//             dataSource={tableData}
//             columns={columns}
//             pagination={false}
//             // style={{
//             //   width: "100%",
//             // }}
//           />
//         </Space>
//         <Row>
//           <Col span={6}>
//             <Space direction="vertical" size="small">
//               <Title level={3} style={{ fontWeight: 700 }}>
//                 {t("FAQs")}
//               </Title>
//               <Text type="secondary">
//                 {t("Everything you need to know about pricing and billing.")}
//               </Text>
//             </Space>
//           </Col>
//           <Col span={18}>
//             <Collapse
//               items={collapseData}
//               onChange={() => {
//                 reportClick("pricing_faq_click");
//               }}
//             />
//           </Col>
//         </Row>
//       </Space>
//       <HasPayForFreePlanModal />
//       <Modal
//         title={t("Buy Credits")}
//         open={addCreditsModalOpen}
//         width={900}
//         centered
//         onCancel={() => setAddCreditsModalOpen(false)}
//         footer={null}
//       >
//         <Space direction="vertical" size="small" style={{ width: "100%" }}>
//           <div
//             style={{
//               textAlign: "left",
//               display: "flex",
//               alignItems: "flex-end",
//               marginBottom: 10,
//             }}
//           >
//             {/* <Title level={4} style={{ marginBottom: 0, marginRight: 10 }}>
//               {t("Buy Credits")}
//             </Title> */}
//             <Text style={{ fontWeight: "bold" }}>
//               {plan.id === 6
//                 ? t("discountText.premium")
//                 : plan.id === 5
//                   ? t("discountText.pro")
//                   : plan.id === 4
//                     ? t("discountText.basic")
//                     : t("discountText.free")}
//             </Text>
//           </div>
//           <Row gutter={[16, 16]}>
//             {creditOptions.map((option) => (
//               <Col key={option.key} xs={12} sm={12} md={6} lg={6} xl={6}>
//                 <Card
//                   hoverable
//                   style={{
//                     textAlign: "center",
//                     borderColor:
//                       JSON.stringify(selectedOptionKey) ===
//                       JSON.stringify(option.key)
//                         ? "#007F61"
//                         : undefined,
//                     borderWidth:
//                       JSON.stringify(selectedOptionKey) ===
//                       JSON.stringify(option.key)
//                         ? "2px"
//                         : "1px",
//                     cursor: "pointer",
//                     display: "flex",
//                     flexDirection: "column",
//                     justifyContent: "center",
//                     alignItems: "center",
//                     height: "150px",
//                   }}
//                   onClick={() => setSelectedOption(option.key)}
//                 >
//                   <Text
//                     style={{
//                       fontSize: "16px",
//                       fontWeight: 500,
//                       display: "block",
//                       marginBottom: "8px",
//                     }}
//                   >
//                     {option.Credits.toLocaleString()} {t("Credits")}
//                   </Text>
//                   {plan.id === 6 || plan.id === 5 || plan.id === 4 ? (
//                     <>
//                       <Title
//                         level={3}
//                         style={{
//                           margin: 0,
//                           color: "#007F61",
//                           fontWeight: 700,
//                         }}
//                       >
//                         ${option.price.currentPrice.toFixed(2)}
//                       </Title>
//                       <Text
//                         delete
//                         type="secondary"
//                         style={{ fontSize: "14px" }}
//                       >
//                         ${option.price.comparedPrice.toFixed(2)}
//                       </Text>
//                     </>
//                   ) : (
//                     <Title
//                       level={3}
//                       style={{ margin: 0, color: "#007F61", fontWeight: 700 }}
//                     >
//                       ${option.price.currentPrice.toFixed(2)}
//                     </Title>
//                   )}
//                 </Card>
//               </Col>
//             ))}
//           </Row>
//           <Flex align="center" justify="center">
//             <Space direction="vertical" align="center">
//               <Text type="secondary" style={{ margin: "16px 0 8px 0" }}>
//                 {t("Total pay")}: $
//                 {selectedOptionKey
//                   ? creditOptions
//                       .find((item) => item.key === selectedOptionKey)
//                       ?.price.currentPrice.toFixed(2)
//                   : "0.00"}
//               </Text>
//               <Button
//                 type="primary"
//                 size="large"
//                 disabled={!selectedOptionKey}
//                 loading={buyButtonLoading}
//                 onClick={handlePay}
//               >
//                 {t("Buy now")}
//               </Button>
//             </Space>
//           </Flex>
//         </Space>
//       </Modal>
//       <Modal
//         title={t("Cancel paid plan?")}
//         open={cancelPlanWarnModal}
//         centered
//         onCancel={() => setCancelPlanWarnModal(false)}
//         footer={
//           <Flex align="end" justify="end" gap={10}>
//             <Button
//               loading={planCancelFetcher.state == "submitting"}
//               onClick={handleCancelPlan}
//             >
//               {t("Switch to free plan")}
//             </Button>
//             <Button
//               type="primary"
//               onClick={() => setCancelPlanWarnModal(false)}
//             >
//               {t("Keep paid plan")}
//             </Button>
//           </Flex>
//         }
//       >
//         <Text>
//           {t(
//             "Moving to the free plan will turn off key features. Are you sure you want to switch?",
//           )}
//         </Text>
//       </Modal>
//       {/* <Modal open={creditsCalculatorOpen} onCancel={() => setCreditsCalculatorOpen(false)}>
//         <Title level={4}>{t("Credits Calculator")}</Title>
//         <Form>
//           <Form.Item label={t("Target Language")} name="targetLanguage">
//             <Select>
//               {modelOptions.map((option) => (
//                 <Select.Option key={option.value} value={option.value}>{option.label}</Select.Option>
//               ))}
//             </Select>
//           </Form.Item>
//           <Form.Item label={t("Translate Model")} name="model">
//             <Select>
//               {modelOptions.map((option) => (
//                 <Select.Option key={option.value} value={option.value}>{option.label}</Select.Option>
//               ))}
//             </Select>
//           </Form.Item>
//           <Form.Item label={t("Translate Items")} name="translateItem">
//             <Checkbox.Group>
//               {translateItemOptions.map((option) => (
//                 <Checkbox key={option.value} value={option.value}>{option.label}</Checkbox>
//               ))}
//             </Checkbox.Group>
//           </Form.Item>
//         </Form>
//       </Modal> */}
//       <Modal
//         centered
//         title={
//           <span style={{ fontSize: "24px", fontWeight: 700 }}>
//             {t("Shared Plan: How to Set Up")}
//           </span>
//         } // 标题加粗
//         open={isModalVisible}
//         onCancel={handleCancel}
//         width={800}
//         style={{ top: 50 }}
//         footer={null} // 移除 OK 和 Cancel 按钮
//         className="custom-modal" // 自定义类名
//       ></Modal>
//       <Modal
//         centered
//         title={
//           <span style={{ fontSize: "24px", fontWeight: 700 }}>
//             {t("Shared Plan: How to Set Up")}
//           </span>
//         } // 标题加粗
//         open={isModalVisible}
//         onCancel={handleCancel}
//         width={800}
//         style={{ top: 50 }}
//         footer={null} // 移除 OK 和 Cancel 按钮
//         className="custom-modal" // 自定义类名
//       >
//         <Card
//           style={{
//             borderRadius: 8,
//             boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
//             marginBottom: 16,
//             fontSize: "16px",
//             lineHeight: "1.5",
//           }}
//         >
//           {/* <h2 style={{fontSize:'16px'}}><strong>{t('Shared Plan: How to Set Up')}</strong></h2> */}
//           <p style={{ marginBottom: "16px" }}>
//             {t(
//               "The Shared Plan lets you extend your purchased plan to multiple stores, so each store can access the same benefits. This makes managing and collaborating across stores simple and seamless.",
//             )}
//           </p>
//           <p>
//             <strong>{t("Note")}</strong>
//             {t(
//               "Points balance and IP quota are not included in sharing. Each store can purchase its own points if needed for features that require points or IP usage.",
//             )}
//           </p>
//         </Card>
//         <Card
//           style={{
//             borderRadius: 8,
//             boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
//             marginBottom: 16,
//             fontSize: "16px",
//             lineHeight: "1.5",
//           }}
//         >
//           <div
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               gap: "8px",
//               marginBottom: "16px",
//             }}
//           >
//             <h2 style={{ fontSize: "18px" }}>
//               <strong>{t("Steps to Bind a Sub-Account")}</strong>
//             </h2>
//             <div>
//               <div>
//                 <strong>{t("1. Get the Store URL")}</strong>
//               </div>
//               <p>
//                 {t("Find the store you want to bind and copy its store URL.")}
//               </p>
//             </div>
//             <div>
//               <div>
//                 <strong>{t("2. Install the App")}</strong>
//               </div>
//               <p>{t("Download and install the official app on that store.")}</p>
//             </div>
//             <div>
//               <div>
//                 <strong>{t("3. Contact Support")}</strong>
//               </div>
//               <p>
//                 {t(
//                   "Share the store URL with our support team and request to bind a sub-account.",
//                 )}
//               </p>
//             </div>
//           </div>
//           <span>{t("💡 Tip:")}</span>
//           <ul style={{ padding: "0 24px" }}>
//             <li>
//               <strong>{t("Pro Plan")}</strong>
//               {t("Share with 1 store")}
//             </li>
//             <li>
//               <strong>{t("Premium Plan")}</strong>
//               {t("Share with up to 3 stores")}
//             </li>
//           </ul>
//         </Card>
//         <div style={{ textAlign: "center", marginTop: 16 }}>
//           <Button
//             type="primary"
//             size="large"
//             onClick={() => {
//               handleContactSupport();
//               setIsModalVisible(false);
//             }}
//           >
//             {t("Contact Support")}
//           </Button>
//         </div>
//       </Modal>
//     </Page>
//   );
// };

// export default Index;

// export const planNum = (id: number) => {
//   if (id == 4) return "Basic";
//   if (id == 5) return "Pro";
//   if (id == 6) return "Premium";
//   return "Free";
// };
