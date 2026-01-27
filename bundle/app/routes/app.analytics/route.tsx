import { Button } from "antd";
import { GetAYTData } from "app/api/javaServer";
import BasicLineChart from "app/components/basicLineChart";
import DonutChart from "app/components/donutChart";
import Header from "app/components/header";
import { globalStore } from "app/globalStore";
import { HelpCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface AnalyticsDataType {
    visitors: number;
    bundleOrders: number;
    conversionRate: number;
    addedRevenue: number;
}

const Index = () => {
    const { t } = useTranslation();

    const [analyticsData, setAnalyticsData] = useState<AnalyticsDataType>({
        visitors: 0,
        bundleOrders: 0,
        conversionRate: 0,
        addedRevenue: 0,
    });
    const [convertData, setConvertData] = useState(
        {
            converted: 0,
            notConverted: 1,
        }
    )
    const [dountChartData, setDountChartData] = useState(
        {
            Xdata: [],
            Ydata: [],
        }
    )
    const [timeRange, setTimeRange] = useState('Last 30d');
    const [filterOpen, setFilterOpen] = useState(false);

    useEffect(() => {
        setTimeout(() => {
            getAYTData()
        }, 500)
    }, [])

    const getAYTData = useCallback(async () => {
        const getAYTData = await GetAYTData({
            shopName: globalStore.shop,
            server: globalStore.server,
        });

        if (getAYTData.success) {
            const data = JSON.parse(getAYTData.response)
            const a = {
                visitors: data?.visitors,
                bundleOrders: data?.bundleOrders,
                conversionRate: data?.conversionRate,
                addedRevenue: data?.addedRevenue,
            }
            const c = {
                converted: data?.bundleConversion?.converted,
                notConverted: data?.bundleConversion?.notConverted,
            }
            const d = {
                Xdata: data?.dailyAddedRevenue?.map((item: any) => item?.date),
                Ydata: data?.dailyAddedRevenue?.map((item: any) => item?.amount),
            }
            setAnalyticsData(a);
            setConvertData(c);
            setDountChartData(d);
        }
    }, [globalStore.shop, globalStore.server]);

    return (
        <div className="max-w-[1280px] mx-auto px-[24px] pt-[24px]">
            {/* Header */}
            <Header backUrl="/app" title={t("Analytics")} />

            {/* Filters Bar */}
            <div className="flex items-center gap-[12px] mb-[24px]">
                <Button
                    type="default"
                    className="!font-['Inter'] !font-medium !text-[14px]"
                    onClick={() => setTimeRange(timeRange === 'Last 30d' ? 'Last 7d' : 'Last 30d')}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="3" width="12" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <path d="M2 6h12" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5 2v2M11 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {timeRange}
                </Button>

                <div style={{ position: 'relative' }}>
                    <Button
                        type="default"
                        className="!font-['Inter'] !font-medium !text-[14px]"
                        onClick={() => setFilterOpen(!filterOpen)}
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        All bundle deals
                    </Button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px] sm:gap-[16px] mb-[16px] sm:mb-[24px]">
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
                <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px]">
                    <div className="flex items-center justify-between mb-[8px]">
                        <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                            Added revenue
                        </span>
                        <HelpCircle size={16} className="text-[#6d7175]" />
                    </div>
                    <h3 className="font-['Inter'] font-semibold text-[24px] leading-[36px] text-[#202223] tracking-[0.3828px] m-0">
                        €{analyticsData.addedRevenue}
                    </h3>
                </div>
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
                        Xdata={dountChartData.Xdata}
                        Ydata={dountChartData.Ydata}
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
