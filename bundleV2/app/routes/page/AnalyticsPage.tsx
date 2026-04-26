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
  defaultOfferId?: string | null;
}

export function AnalyticsPage({ shop, offers, defaultOfferId }: AnalyticsPageProps) {
  const surfaceCardClass =
    "rounded-[12px] border border-[#dfe3e8] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";
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

  const [selectedOffer, setSelectedOffer] = useState<string>(defaultOfferId || "all");

  useEffect(() => {
    if (defaultOfferId) {
      setSelectedOffer(defaultOfferId);
    } else {
      setSelectedOffer("all");
    }
  }, [defaultOfferId]);
  const offerOptions = useMemo(() => {
    const allOption = [{ label: "All bundle deals", value: "all" }];
    return [
      ...allOption,
      ...(offers || []).map((offer) => ({
        label: offer.name,
        value: offer.name,
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

        const overviewQuery = new URLSearchParams({
          mode: "overview",
          shopName: shop,
          from: from.toISOString(),
          to: now.toISOString(),
        });

        const trendQuery = new URLSearchParams({
          mode: "trend",
          shopName: shop,
          from: from.toISOString(),
          to: now.toISOString(),
        });

        const name = selectedOffer === 'all' ? 'bundle' : selectedOffer;
        overviewQuery.set("name", name);
        trendQuery.set("name", name);

        const [overviewResponse, trendResponse] = await Promise.all([
          fetch(`/webpixerToAli?${overviewQuery.toString()}`, {
            method: "GET",
            signal: controller.signal,
          }),
          fetch(`/webpixerToAli?${trendQuery.toString()}`, {
            method: "GET",
            signal: controller.signal,
          }),
        ]);

        const overviewData = await overviewResponse.json();
        const trendData = await trendResponse.json();

        if (overviewResponse.ok && overviewData.success && overviewData.metrics) {
          const m = overviewData.metrics;
          setAnalyticsData({
            visitors: m.visitor || 0,
            bundleOrders: m.bundleOrders || 0,
            conversionRate: m.conversion || 0,
          });
        }

        if (trendResponse.ok && trendData.success && Array.isArray(trendData.series)) {
          const xData = trendData.series.map((item: { date?: string }) => {
            const d = new Date(String(item.date || ""));
            if (Number.isNaN(d.getTime())) return String(item.date || "");
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          });
          const yData = trendData.series.map((item: { gmv?: number }) =>
            Number(item.gmv) || 0,
          );
          setBasicLineChartData({
            Xdata: xData,
            Ydata: yData,
          });
        } else {
          setBasicLineChartData({ Xdata: [], Ydata: [] });
        }
      } catch (error: any) {
        if (error.name === "AbortError") return;
        console.error("Failed to fetch analytics:", error);
      }
    };

    fetchAnalytics();

    return () => controller.abort();
  }, [shop, selectedTimeRange, selectedOffer]);

  return (
    <div className="max-w-[1280px] mx-auto pb-[24px]">
      <div className="mb-[14px] flex flex-col gap-[12px] lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-[760px]">
          <h1 className="m-0 text-[24px] font-semibold leading-[32px] tracking-[-0.02em] text-[#1c1f23] sm:text-[28px] sm:leading-[36px]">
            Analytics
          </h1>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={`${surfaceCardClass} mb-[24px] p-[16px] sm:p-[20px]`}>
        <div className="flex flex-col gap-[12px] sm:flex-row">
          <Select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e)}
            options={timeRangeOptions}
            style={{ width: "100%", maxWidth: 220 }}
          />
          <Select
            value={selectedOffer}
            onChange={(e) => setSelectedOffer(e)}
            options={offerOptions}
            style={{ width: "100%", maxWidth: 280 }}
          />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px] mb-[24px]">
        {/* Visitors */}
        <div className={`${surfaceCardClass} p-[20px] sm:p-[24px]`}>
          <div className="mb-[8px] text-[12px] font-medium uppercase tracking-[0.08em] text-[#6d7175]">
            Reach
          </div>
          <div className="flex items-center justify-between mb-[12px]">
            <span className="font-sans font-medium text-[14px] text-[#5c6166]">
              Visitors
            </span>
            <CircleHelp size={16} className="text-[#5c6166]" />
          </div>
          <h3 className="m-0 font-sans text-[28px] font-semibold leading-[38px] text-[#1c1f23]">
            {analyticsData.visitors.toLocaleString()}
          </h3>
          <p className="mt-[8px] mb-0 text-[13px] leading-[20px] text-[#5c6166]">
            Unique shoppers who reached a bundle-enabled buying surface.
          </p>
        </div>

        {/* Bundle orders */}
        <div className={`${surfaceCardClass} p-[20px] sm:p-[24px]`}>
          <div className="mb-[8px] text-[12px] font-medium uppercase tracking-[0.08em] text-[#6d7175]">
            Orders
          </div>
          <div className="flex items-center justify-between mb-[12px]">
            <span className="font-sans font-medium text-[14px] text-[#5c6166]">
              Bundle orders
            </span>
            <CircleHelp size={16} className="text-[#5c6166]" />
          </div>
          <h3 className="m-0 font-sans text-[28px] font-semibold leading-[38px] text-[#1c1f23]">
            {analyticsData.bundleOrders.toLocaleString()}
          </h3>
          <p className="mt-[8px] mb-0 text-[13px] leading-[20px] text-[#5c6166]">
            Orders that completed with a bundle purchase attached.
          </p>
        </div>

        {/* Conversion to bundle */}
        <div className={`${surfaceCardClass} p-[20px] sm:p-[24px]`}>
          <div className="mb-[8px] text-[12px] font-medium uppercase tracking-[0.08em] text-[#6d7175]">
            Efficiency
          </div>
          <div className="flex items-center justify-between mb-[12px]">
            <span className="font-sans font-medium text-[14px] text-[#5c6166]">
              Conversion to bundle
            </span>
            <CircleHelp size={16} className="text-[#5c6166]" />
          </div>
          <h3 className="m-0 font-sans text-[28px] font-semibold leading-[38px] text-[#1c1f23]">
            {(analyticsData.conversionRate * 100).toFixed(2)}%
          </h3>
          <p className="mt-[8px] mb-0 text-[13px] leading-[20px] text-[#5c6166]">
            Share of visitors who converted into bundle orders.
          </p>
        </div>
      </div>

      {/* Daily added revenue - Line Chart */}
      <div className={`${surfaceCardClass} p-[20px] sm:p-[24px]`}>
        <div className="mb-[6px] text-[12px] font-medium uppercase tracking-[0.08em] text-[#6d7175]">
          Revenue Trend
        </div>
        <h3 className="m-0 mb-[8px] font-sans text-[18px] font-semibold leading-[28px] text-[#1c1f23]">
          Daily added revenue
        </h3>
        <p className="mb-[24px] font-sans text-[13px] leading-[20px] text-[#5c6166]">
          See how much additional revenue your bundles contribute each day over the selected range.
        </p>
        <BasicLineChart
          Xdata={basicLineChartData.Xdata}
          Ydata={basicLineChartData.Ydata}
        />
      </div>
    </div>
  );
}
