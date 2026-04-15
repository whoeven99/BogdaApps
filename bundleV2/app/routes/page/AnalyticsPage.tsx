import { Select } from "antd";
import { CircleHelp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BasicLineChart from "../component/BasicLineChart/BasicLineChart";

interface AnalyticsDataType {
  visitors: number;
  bundleOrders: number;
  conversionRate: number;
}

interface AnalyticsPageProps {
  shop: string;
  offers: Array<{ id: string; name: string }>;
}

export function AnalyticsPage({ shop, offers }: AnalyticsPageProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDataType>({
    visitors: 0,
    bundleOrders: 0,
    conversionRate: 0,
  });

  const [basicLineChartData, setBasicLineChartData] = useState<{
    Xdata: string[];
    Ydata: number[];
  }>({
    Xdata: [],
    Ydata: [],
  });

  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(7);
  const timeRangeOptions = [
    { label: "Last 7d", value: 7 },
    { label: "Last 30d", value: 30 },
    { label: "Last 60d", value: 60 },
  ];

  const [selectedOffer, setSelectedOffer] = useState<string>("all");
  const offerOptions = useMemo(() => {
    const allOption = [{ label: "All bundle deals", value: "all" }];
    return [
      ...allOption,
      ...(offers || []).map((offer) => ({
        label: offer.name,
        value: offer.id,
      })),
    ];
  }, [offers]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchAnalytics = async () => {
      try {
        const now = new Date();
        const from = new Date(
          now.getTime() - selectedTimeRange * 24 * 60 * 60 * 1000,
        );

        const query = new URLSearchParams({
          mode: "overview",
          shopName: shop,
          from: from.toISOString(),
          to: now.toISOString(),
          bundleId: selectedOffer === "all" ? "" : selectedOffer,
        });

        const response = await fetch(`/webpixerToAli?${query.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        const data = await response.json();

        if (response.ok && data.success && data.metrics) {
          const m = data.metrics;
          setAnalyticsData({
            visitors: m.visitor || 0,
            bundleOrders: m.bundleOrders || 0,
            conversionRate: m.conversion || 0,
          });
        }
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Failed to fetch analytics:", error);
      }
    };

    fetchAnalytics();

    return () => controller.abort();
  }, [shop, selectedTimeRange, selectedOffer]);

  // Mock trend data for now until webpixerToAli supports trend queries
  useEffect(() => {
    const mockDates = Array.from({ length: selectedTimeRange }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (selectedTimeRange - 1 - i));
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

    const mockValues = Array.from(
      { length: selectedTimeRange },
      () => Math.floor(Math.random() * 500) + 100,
    );

    setBasicLineChartData({
      Xdata: mockDates,
      Ydata: mockValues,
    });
  }, [selectedTimeRange]);

  return (
    <div className="max-w-[1280px] mx-auto pb-[24px]">
      <div className="mb-[24px]">
        <h1 className="text-[20px] font-semibold text-[#1c1f23] m-0">
          Analytics
        </h1>
      </div>

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px] mb-[24px]">
        {/* Visitors */}
        <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[24px]">
          <div className="flex items-center justify-between mb-[12px]">
            <span className="font-sans font-normal text-[14px] text-[#5c6166]">
              Visitors
            </span>
            <CircleHelp size={16} className="text-[#5c6166]" />
          </div>
          <h3 className="font-sans font-semibold text-[20px] text-[#1c1f23] m-0">
            {analyticsData.visitors.toLocaleString()}
          </h3>
        </div>

        {/* Bundle orders */}
        <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[24px]">
          <div className="flex items-center justify-between mb-[12px]">
            <span className="font-sans font-normal text-[14px] text-[#5c6166]">
              Bundle orders
            </span>
            <CircleHelp size={16} className="text-[#5c6166]" />
          </div>
          <h3 className="font-sans font-semibold text-[20px] text-[#1c1f23] m-0">
            {analyticsData.bundleOrders.toLocaleString()}
          </h3>
        </div>

        {/* Conversion to bundle */}
        <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[24px]">
          <div className="flex items-center justify-between mb-[12px]">
            <span className="font-sans font-normal text-[14px] text-[#5c6166]">
              Conversion to bundle
            </span>
            <CircleHelp size={16} className="text-[#5c6166]" />
          </div>
          <h3 className="font-sans font-semibold text-[20px] text-[#1c1f23] m-0">
            {analyticsData.conversionRate.toFixed(2)}%
          </h3>
        </div>
      </div>

      {/* Daily added revenue - Line Chart */}
      <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[24px]">
        <h3 className="font-sans font-semibold text-[14px] text-[#1c1f23] m-0 mb-[8px]">
          Daily added revenue
        </h3>
        <p className="font-sans font-normal text-[13px] text-[#5c6166] mb-[24px]">
          See how much additional revenue you're making with this app every day.
        </p>
        <BasicLineChart
          Xdata={basicLineChartData.Xdata}
          Ydata={basicLineChartData.Ydata}
        />
      </div>
    </div>
  );
}
