import { Button, Select } from "antd";
import { BundleOrdersByTimeAndShopName, GetConversionToBundle, GetConversionToBundleAmount, ProductUvByTimeAndShopName } from "app/api/javaServer";
import BasicLineChart from "app/components/basicLineChart";
import Header from "app/components/header";
import { globalStore } from "app/globalStore";
import { OfferType } from "app/types";
import { HelpCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import dayjs from "dayjs";

interface AnalyticsDataType {
    visitors: number;
    bundleOrders: number;
    conversionRate: number;
}

const Index = () => {
    const { t } = useTranslation();
    const offersData: OfferType[] = useSelector((state: any) => state.offersData);

    const [analyticsData, setAnalyticsData] = useState<AnalyticsDataType>({
        visitors: 0,
        bundleOrders: 0,
        conversionRate: 0,
    });
    const [basicLineChartData, setBasicLineChartData] = useState<
        {
            Xdata: string[];
            Ydata: string[];
        }
    >(
        {
            Xdata: [],
            Ydata: [],
        }
    )

    const [selectedTimeRange, setSelectedTimeRange] = useState<number>(60);
    const timeRangeOptions = [
        { label: 'Last 7d', value: 7 },
        { label: 'Last 30d', value: 30 },
        { label: 'Last 60d', value: 60 },
    ]

    const [selectedOffer, setSelectedOffer] = useState<string>("all");
    const offerOptions = useMemo(() => {
        const a = [
            {
                label: "All bundle deals",
                value: "all",
            }
        ]

        return [...a, ...offersData.map((offer) => ({
            label: offer.name,
            value: offer.id,
        }))]
    }, [offersData])

    useEffect(() => {
        productUvByTimeAndShopName()
        bundleOrdersByTimeAndShopName()
        getConversionToBundle()
        getConversionToBundleAmount()
    }, [selectedTimeRange, selectedOffer])

    useEffect(() => {
        console.log(basicLineChartData)
    }, [basicLineChartData])

    const productUvByTimeAndShopName = useCallback(async () => {
        const productUvByTimeAndShopName = await ProductUvByTimeAndShopName({
            shopName: globalStore.shop,
            server: globalStore.server,
            day: selectedTimeRange,
            bundleId: selectedOffer === "all" ? undefined : selectedOffer,
        });

        if (productUvByTimeAndShopName.success) {
            const data = productUvByTimeAndShopName.response
            setAnalyticsData(prev => ({
                ...prev,
                visitors: data?.visitors || 0,
            }));
        }
    }, [globalStore.shop, globalStore.server, selectedTimeRange, selectedOffer]);

    const bundleOrdersByTimeAndShopName = useCallback(async () => {
        const bundleOrdersByTimeAndShopName = await BundleOrdersByTimeAndShopName({
            shopName: globalStore.shop,
            server: globalStore.server,
            day: selectedTimeRange,
            bundleId: selectedOffer === "all" ? undefined : selectedOffer,
        });

        if (bundleOrdersByTimeAndShopName.success) {
            const data = bundleOrdersByTimeAndShopName.response
            setAnalyticsData(prev => ({
                ...prev,
                bundleOrders: data?.bundleOrders || 0,
            }));
        }
    }, [globalStore.shop, globalStore.server, selectedTimeRange, selectedOffer]);

    const getConversionToBundle = useCallback(async () => {
        const getConversionToBundle = await GetConversionToBundle({
            shopName: globalStore.shop,
            server: globalStore.server,
            day: selectedTimeRange,
            bundleId: selectedOffer === "all" ? undefined : selectedOffer,
        });

        if (getConversionToBundle.success) {
            const data = getConversionToBundle.response
            setAnalyticsData(prev => ({
                ...prev,
                conversionRate: data?.conversionToBundle || 0,
            }));
        }
    }, [globalStore.shop, globalStore.server, selectedTimeRange, selectedOffer]);

    const getConversionToBundleAmount = useCallback(async () => {
        const getConversionToBundleAmount = await GetConversionToBundleAmount({
            shopName: globalStore.shop,
            server: globalStore.server,
            day: selectedTimeRange,
            bundleId: selectedOffer === "all" ? undefined : selectedOffer,
        });

        if (getConversionToBundleAmount.success) {
            const data = getConversionToBundleAmount.response?.dailyAddRevenue
            console.log(data);
            console.log(Array.isArray(data));
            console.log(data?.length);

            if (Array.isArray(data) && data.length > 0) {
                const Xdata = data?.map((item) => dayjs(item?.date).format("MMM D"))
                const Ydata = data?.map((item) => Number(item?.daily_total_amount)?.toFixed(2))
                console.log(Xdata);
                console.log(Ydata);

                setBasicLineChartData({
                    Xdata: Xdata || [],
                    Ydata: Ydata || [],
                })
            }
        }
    }, [globalStore.shop, globalStore.server, selectedTimeRange, selectedOffer]);

    return (
        <div className="max-w-[1280px] mx-auto px-[24px] pt-[24px]">
            {/* Header */}
            <Header backUrl="/app" title={t("Analytics")} />

            {/* Filters Bar */}
            <div className="flex items-center gap-[12px] mb-[24px]">
                <Select
                    value={selectedTimeRange}
                    onChange={(e) => setSelectedTimeRange(e)}
                    options={timeRangeOptions}
                    style={{ width: 200 }}
                />
                <Select
                    value={selectedOffer}
                    onChange={(e) => setSelectedOffer(e)}
                    options={offerOptions}
                    style={{ width: 200 }}
                />
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-[12px] mb-[16px]">
                {/* Visitors */}
                <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px]">
                    <div className="flex items-center justify-between mb-[8px]">
                        <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                            Visitors
                        </span>
                        <HelpCircle size={16} className="text-[#6d7175]" />
                    </div>
                    <h3 className="font-['Inter'] font-semibold text-[24px] leading-[36px] text-[#202223] tracking-[0.3828px] m-0">
                        {analyticsData.visitors}
                    </h3>
                </div>

                {/* Bundle orders */}
                <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px]">
                    <div className="flex items-center justify-between mb-[8px]">
                        <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                            Bundle orders
                        </span>
                        <HelpCircle size={16} className="text-[#6d7175]" />
                    </div>
                    <h3 className="font-['Inter'] font-semibold text-[24px] leading-[36px] text-[#202223] tracking-[0.3828px] m-0">
                        {analyticsData.bundleOrders}
                    </h3>
                </div>

                {/* Conversion to bundle */}
                <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px]">
                    <div className="flex items-center justify-between mb-[8px]">
                        <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                            Conversion to bundle
                        </span>
                        <HelpCircle size={16} className="text-[#6d7175]" />
                    </div>
                    <h3 className="font-['Inter'] font-semibold text-[24px] leading-[36px] text-[#202223] tracking-[0.3828px] m-0">
                        {analyticsData.conversionRate}%
                    </h3>
                </div>

                {/* Added revenue */}
                {/* <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px]">
                    <div className="flex items-center justify-between mb-[8px]">
                        <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                            Added revenue
                        </span>
                        <HelpCircle size={16} className="text-[#6d7175]" />
                    </div>
                    <h3 className="font-['Inter'] font-semibold text-[24px] leading-[36px] text-[#202223] tracking-[0.3828px] m-0">
                        €{analyticsData.addedRevenue}
                    </h3>
                </div> */}
            </div>

            <div
                style={{
                    paddingBottom: '24px'
                }}
            >
                {/* Daily added revenue - Line Chart */}
                <div
                    className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]"

                >
                    <h3 className="font-['Inter'] font-semibold text-[16px] leading-[24px] text-[#202223] tracking-[-0.3203px] m-0 mb-[8px]">
                        Daily added revenue
                    </h3>
                    <p className="font-['Inter'] font-normal text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px] mb-[24px]">
                        See how much additional revenue you're making with this app every day.
                    </p>
                    <BasicLineChart
                        Xdata={basicLineChartData.Xdata}
                        Ydata={basicLineChartData.Ydata}
                    />

                    {/* <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={dailyRevenueData}>
                            <CartesianGrid strokeDasharray="0" stroke="#e3e5e7" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: '#6d7175' }}
                                axisLine={{ stroke: '#e3e5e7' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#6d7175' }}
                                axisLine={{ stroke: '#e3e5e7' }}
                                tickLine={false}
                                domain={[0, 10]}
                                ticks={[0, 2.5, 5, 7.5, 10]}
                                tickFormatter={(value) => `€${value}.00`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #c4cdd5',
                                    borderRadius: '6px',
                                    fontSize: '12px'
                                }}
                            />
                            <Legend
                                wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
                                formatter={(value) => {
                                    if (value === 'current') return '28 Nov - 28 Dec, 2025';
                                    if (value === 'previous') return '30 Oct - 28 Nov, 2025';
                                    return value;
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#5c6ac4"
                                strokeWidth={2}
                                dot={false}
                                name="current"
                            />
                        </LineChart>
                    </ResponsiveContainer> */}
                </div>
            </div>
        </div>
    );
};

export default Index;
