import { useEffect, useState } from "react";
import {
  Form,
  useNavigation,
  useSearchParams,
  useActionData,
} from "react-router";
import {
  ArrowDown,
  ArrowUp,
  ChartBar,
  Pencil,
  Trash2,
} from "lucide-react";
import "../styles/tailwind.css";
import { CreateNewOffer } from "./component/CreateNewOffer";
import BasicLineChart from "../components/basicLineChart";
import type { IndexLoaderData } from "./_index/route";

interface DashboardPageProps {
  onViewAllOffers?: () => void;
  onViewAnalytics?: () => void;
  onCreateOffer?: () => void;
  offers?: IndexLoaderData["offers"];
  storeProducts?: IndexLoaderData["storeProducts"];
  markets?: IndexLoaderData["markets"];
  shop: string;
  apiKey: string;
  themeExtensionEnabled: boolean;
}

type DashboardOfferRow = {
  id: string;
  name: string;
  isActive: boolean;
  exposurePV: number;
  addToCartPV: number;
  gmv: number;
  conversion: number;
};

type GmvOverviewMetrics = {
  totalGmv: number;
  conversion: number;
  visitor: number;
  bundleOrders: number;
  exposurePv: number;
  orderPv: number;
};

const mockAbTests = [
  {
    id: 1,
    name: "Summer Bundle Test",
    status: "Running" as const,
    variant: "A vs B",
    pv: "45,230",
    extraGMV: "$1,240",
    improvement: 15.3,
    daysRunning: 14,
    confidence: 95,
  },
  {
    id: 2,
    name: "Winter Promotion Test",
    status: "Paused" as const,
    variant: "A vs B vs C",
    pv: "38,150",
    extraGMV: "$890",
    improvement: -8.2,
    daysRunning: 21,
    confidence: 78,
  },
];

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 12L10 8L6 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardPage({
  onViewAllOffers,
  onViewAnalytics,
  onCreateOffer,
  offers,
  storeProducts = [],
  markets = [],
  shop,
  apiKey,
  themeExtensionEnabled,
}: DashboardPageProps) {
  const [searchParams] = useSearchParams();
  const actionData = useActionData() as { toast?: string } | undefined;
  const navigation = useNavigation();
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [deletingOffer, setDeletingOffer] = useState<DashboardOfferRow | null>(
    null,
  );
  const [togglingIds, setTogglingIds] = useState<string[]>([]);

  const offerRows: DashboardOfferRow[] = (offers ?? []).map((offer) => {
    const isActive = !!offer.status;
    const exposurePV = offer.exposurePV ?? 0;
    const addToCartPV = offer.addToCartPV ?? 0;
    const gmv = offer.gmv ?? 0;
    const conversion = offer.conversion ?? 0;

    return {
      id: offer.id,
      name: offer.name,
      isActive,
      exposurePV,
      addToCartPV,
      gmv,
      conversion,
    };
  });

  const visibleOffers = offerRows.slice(0, 4);

  // 计算真实 Overview 数据
  const realOverview = (() => {
    let totalGmv = 0;
    let totalExposure = 0;
    let totalAddToCart = 0;
    let activeOffers = 0;

    offerRows.forEach((o) => {
      totalGmv += o.gmv || 0;
      totalExposure += o.exposurePV || 0;
      totalAddToCart += o.addToCartPV || 0;
      if (o.isActive) activeOffers += 1;
    });

    const avgConversion =
      totalExposure > 0 ? (totalAddToCart / totalExposure) * 100 : 0;

    return {
      totalGmv: `$${totalGmv.toLocaleString()}`,
      gmvTrend: "+0.0%",
      gmvTrendLabel: "from last month",
      activeOffers,
      activeOffersTrend: "currently running",
      avgConversion: `${avgConversion.toFixed(1)}%`,
      conversionTrendLabel: "Overall avg",
      conversionTrendColor: "text-[#916a00]" as const,
    };
  })();

  useEffect(() => {
    if (navigation.state === "submitting" && navigation.formData) {
      const intent = navigation.formData.get("intent");
      const id = navigation.formData.get("offerId");
      if (intent === "toggle-offer-status" && typeof id === "string" && id) {
        setTogglingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }
    } else if (navigation.state === "idle" && togglingIds.length > 0) {
      const timer = setTimeout(() => {
        setTogglingIds([]);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [navigation.state, navigation.formData, togglingIds.length]);

  const getIsToggling = (offerId: string) => togglingIds.includes(offerId);

  const handleViewDetails = () => {
    onViewAnalytics?.();
  };
  const handleCreateOfferClick = () => {
    if (onCreateOffer) {
      onCreateOffer();
    } else {
      setEditingOfferId(null);
      setShowCreateOffer(true);
    }
  };
  const handleCreateAbTest = () => {}; // mock
  const handleViewAllOffers = () => {
    if (onViewAllOffers) {
      onViewAllOffers();
    }
  };
  const handleViewAllAbTests = () => {}; // mock
  const handleNeedHelp = () => {}; // mock
  const handleThemeExtensionToggle = () => {
    const storeHandle = shop.replace(".myshopify.com", "");
    const appEmbed = `${apiKey}/product_detail_message`;
    const editorUrl = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor?context=apps&appEmbed=${encodeURIComponent(appEmbed)}`;
    window.open(editorUrl, "_top");
  };

  const toast = searchParams.get("toast") || actionData?.toast;

  useEffect(() => {
    if (toast === "delete-success") {
      setDeletingOffer(null);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    const now = new Date();
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const query = new URLSearchParams({
      mode: "overview",
      shopName: shop,
      from: from.toISOString(),
      to: now.toISOString(),
    });

    const run = async () => {
      try {
        const response = await fetch(`/webpixerToAli?${query.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          metrics?: GmvOverviewMetrics;
          range?: { from?: string; to?: string };
          logsFetched?: number;
        };

        if (!response.ok || !data.success) {
          console.error("[dashboard][gmv-overview] query failed", {
            status: response.status,
            message: data?.message || "unknown error",
            shop,
            range: data?.range,
          });
          return;
        }

        console.log("[dashboard][gmv-overview] metrics", {
          shop,
          range: data.range,
          logsFetched: data.logsFetched ?? 0,
          totalGmv: data.metrics?.totalGmv ?? 0,
          conversion: data.metrics?.conversion ?? 0,
          visitor: data.metrics?.visitor ?? 0,
          bundleOrders: data.metrics?.bundleOrders ?? 0,
          exposurePv: data.metrics?.exposurePv ?? 0,
          orderPv: data.metrics?.orderPv ?? 0,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[dashboard][gmv-overview] query exception", {
          shop,
          error: String(error),
        });
      }
    };

    run();

    return () => controller.abort();
  }, [shop]);

  useEffect(() => {
    if (
      toast === "create-success" ||
      toast === "update-success" ||
      toast === "delete-success"
    ) {
      setShowCreateOffer(false);
      setDeletingOffer(null);
    }
  }, [toast]);

  if (showCreateOffer) {
    const editingOffer =
      editingOfferId && offers
        ? (offers.find((o) => o.id === editingOfferId) as any)
        : undefined;

    return (
      <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
        <CreateNewOffer
          onBack={() => setShowCreateOffer(false)}
          initialOffer={editingOffer}
          storeProducts={storeProducts}
          markets={markets}
          existingOffers={(offers ?? []).map((o) => ({
            id: o.id,
            name: o.name,
          }))}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
      {/* GMV Overview + Theme Extension */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[16px] sm:gap-[24px] mb-[24px] sm:mb-[36px]">
        {/* GMV Overview Card */}
        <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[24px]">
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="font-sans font-semibold text-[20px] leading-[30px] text-[#1c1f23] tracking-tight m-0">
              GMV Overview
            </h2>
            <button
              type="button"
              className="text-[#008060] font-medium text-[14px] bg-transparent hover:bg-[#f0f9f6] px-[12px] py-[6px] rounded-[8px] flex items-center gap-[6px] transition-all border-0 cursor-pointer"
              onClick={handleViewDetails}
            >
              View Details
              <ChevronRightIcon />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] sm:gap-[20px]">
            <div className="flex flex-col gap-[12px] sm:gap-[16px]">
              <span className="font-sans font-normal text-[14px] leading-[22.4px] text-[#5c6166] tracking-normal">
                Total GMV
              </span>
              <h3 className="font-sans font-semibold text-[28px] leading-[42px] text-[#1c1f23] tracking-wide m-0">
                {realOverview.totalGmv}
              </h3>
              <span className="font-sans font-normal text-[14px] leading-[22.4px] text-[#108043] tracking-normal">
                {realOverview.gmvTrend} {realOverview.gmvTrendLabel}
              </span>
            </div>
            <div className="flex flex-col gap-[16px]">
              <span className="font-sans font-normal text-[14px] leading-[22.4px] text-[#5c6166] tracking-normal">
                Active Offers
              </span>
              <h3 className="font-sans font-semibold text-[28px] leading-[42px] text-[#1c1f23] tracking-wide m-0">
                {realOverview.activeOffers}
              </h3>
              <span className="font-sans font-normal text-[14px] leading-[22.4px] text-[#108043] tracking-normal">
                {realOverview.activeOffersTrend}
              </span>
            </div>
            <div className="flex flex-col gap-[16px]">
              <span className="font-sans font-normal text-[14px] leading-[22.4px] text-[#5c6166] tracking-normal">
                Avg. Conversion
              </span>
              <h3 className="font-sans font-semibold text-[28px] leading-[42px] text-[#1c1f23] tracking-wide m-0">
                {realOverview.avgConversion}
              </h3>
              <span
                className={`font-sans font-normal text-[14px] leading-[22.4px] tracking-normal ${realOverview.conversionTrendColor}`}
              >
                {realOverview.conversionTrendLabel}
              </span>
            </div>
          </div>

          om "react";
import {
  Form,
  useNavigation,
  useSearchParams,
  useActionData,
} from "react-router";
import {
  ArrowDown,
  ArrowUp,
  ChartBar,
  Pencil,
  Trash2,
} from "lucide-react";
import "../styles/tailwind.css";
import { CreateNewOffer } from "./component/CreateNewOffer";
import BasicLineChart from "../components/basicLineChart";
import type { IndexLoaderData } from "./_index/route";

interface DashboardPageProps {
  onViewAllOffers?: () => void;
  onViewAnalytics?: () => void;
  onCreateOffer?: () => void;
  offers?: IndexLoaderData["offers"];
  storeProducts?: IndexLoaderData["storeProducts"];
  markets?: IndexLoaderData["markets"];
  shop: string;
  apiKey: string;
  themeExtensionEnabled: boolean;
}

type DashboardOfferRow = {
  id: string;
  name: string;
  isActive: boolean;
  exposurePV: number;
  addToCartPV: number;
  gmv: number;
  conversion: number;
};

type GmvOverviewMetrics = {
  totalGmv: number;
  conversion: number;
  visitor: number;
  bundleOrders: number;
  exposurePv: number;
  orderPv: number;
};

const mockAbTests = [
  {
    id: 1,
    name: "Summer Bundle Test",
    status: "Running" as const,
    variant: "A vs B",
    pv: "45,230",
    extraGMV: "$1,240",
    improvement: 15.3,
    daysRunning: 14,
    confidence: 95,
  },
  {
    id: 2,
    name: "Winter Promotion Test",
    status: "Paused" as const,
    variant: "A vs B vs C",
    pv: "38,150",
    extraGMV: "$890",
    improvement: -8.2,
    daysRunning: 21,
    confidence: 78,
  },
];

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 12L10 8L6 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardPage({
  onViewAllOffers,
  onViewAnalytics,
  onCreateOffer,
  offers,
  storeProducts = [],
  markets = [],
  shop,
  apiKey,
  themeExtensionEnabled,
}: DashboardPageProps) {
  const [searchParams] = useSearchParams();
  const actionData = useActionData() as { toast?: string } | undefined;
  const navigation = useNavigation();
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [deletingOffer, setDeletingOffer] = useState<DashboardOfferRow | null>(
    null,
  );
  const [togglingIds, setTogglingIds] = useState<string[]>([]);

  const offerRows: DashboardOfferRow[] = (offers ?? []).map((offer) => {
    const isActive = !!offer.status;
    const exposurePV = offer.exposurePV ?? 0;
    const addToCartPV = offer.addToCartPV ?? 0;
    const gmv = offer.gmv ?? 0;
    const conversion = offer.conversion ?? 0;

    return {
      id: offer.id,
      name: offer.name,
      isActive,
      exposurePV,
      addToCartPV,
      gmv,
      conversion,
    };
  });

  const visibleOffers = offerRows.slice(0, 4);

  // 计算真实 Overview 数据
  const realOverview = (() => {
    let totalGmv = 0;
    let totalExposure = 0;
    let totalAddToCart = 0;
    let activeOffers = 0;

    offerRows.forEach((o) => {
      totalGmv += o.gmv || 0;
      totalExposure += o.exposurePV || 0;
      totalAddToCart += o.addToCartPV || 0;
      if (o.isActive) activeOffers += 1;
    });

    const avgConversion =
      totalExposure > 0 ? (totalAddToCart / totalExposure) * 100 : 0;

    return {
      totalGmv: `$${totalGmv.toLocaleString()}`,
      gmvTrend: "+0.0%",
      gmvTrendLabel: "from last month",
      activeOffers,
      activeOffersTrend: "currently running",
      avgConversion: `${avgConversion.toFixed(1)}%`,
      conversionTrendLabel: "Overall avg",
      conversionTrendColor: "text-[#916a00]" as const,
    };
  })();

  useEffect(() => {
    if (navigation.state === "submitting" && navigation.formData) {
      const intent = navigation.formData.get("intent");
      const id = navigation.formData.get("offerId");
      if (intent === "toggle-offer-status" && typeof id === "string" && id) {
        setTogglingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }
    } else if (navigation.state === "idle" && togglingIds.length > 0) {
      const timer = setTimeout(() => {
        setTogglingIds([]);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [navigation.state, navigation.formData, togglingIds.length]);

  const getIsToggling = (offerId: string) => togglingIds.includes(offerId);

  const handleViewDetails = () => {
    onViewAnalytics?.();
  };
  const handleCreateOfferClick = () => {
    if (onCreateOffer) {
      onCreateOffer();
    } else {
      setEditingOfferId(null);
      setShowCreateOffer(true);
    }
  };
  const handleCreateAbTest = () => {}; // mock
  const handleViewAllOffers = () => {
    if (onViewAllOffers) {
      onViewAllOffers();
    }
  };
  const handleViewAllAbTests = () => {}; // mock
  const handleNeedHelp = () => {}; // mock
  const handleThemeExtensionToggle = () => {
    const storeHandle = shop.replace(".myshopify.com", "");
    const appEmbed = `${apiKey}/product_detail_message`;
    const editorUrl = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor?context=apps&appEmbed=${encodeURIComponent(appEmbed)}`;
    window.open(editorUrl, "_top");
  };

  const toast = searchParams.get("toast") || actionData?.toast;

  useEffect(() => {
    if (toast === "delete-success") {
      setDeletingOffer(null);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    const now = new Date();
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const query = new URLSearchParams({
      mode: "overview",
      shopName: shop,
      from: from.toISOString(),
      to: now.toISOString(),
    });

    const run = async () => {
      try {
        const response = await fetch(`/webpixerToAli?${query.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          metrics?: GmvOverviewMetrics;
          range?: { from?: string; to?: string };
          logsFetched?: number;
        };

        if (!response.ok || !data.success) {
          console.error("[dashboard][gmv-overview] query failed", {
            status: response.status,
            message: data?.message || "unknown error",
            shop,
            range: data?.range,
          });
          return;
        }

        console.log("[dashboard][gmv-overview] metrics", {
          shop,
          range: data.range,
          logsFetched: data.logsFetched ?? 0,
          totalGmv: data.metrics?.totalGmv ?? 0,
          conversion: data.metrics?.conversion ?? 0,
          visitor: data.metrics?.visitor ?? 0,
          bundleOrders: data.metrics?.bundleOrders ?? 0,
          exposurePv: data.metrics?.exposurePv ?? 0,
          orderPv: data.metrics?.orderPv ?? 0,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[dashboard][gmv-overview] query exception", {
          shop,
          error: String(error),
        });
      }
    };

    run();

    return () => controller.abort();
  }, [shop]);

  useEffect(() => {
    if (
      toast === "create-success" ||
      toast === "update-success" ||
      toast === "delete-success"
    ) {
      setShowCreateOffer(false);
      setDeletingOffer(null);
    }
  }, [toast]);

  if (showCreateOffer) {
    const editingOffer =
      editingOfferId && offers
        ? (offers.find((o) => o.id === editingOfferId) as any)
        : undefined;

    return (
      <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
        <CreateNewOffer
          onBack={() => setShowCreateOffer(false)}
          initialOffer={editingOffer}
          storeProducts={storeProducts}
          markets={markets}
          existingOffers={(offers ?? []).map((o) => ({
            id: o.id,
            name: o.name,
          }))}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
      {/* GMV Overview + Theme Extension */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[16px] sm:gap-[24px] mb-[24px] sm:mb-[36px]">
        {/* GMV Overview Card */}
        <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[24px]">
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="font-sans font-semibold text-[20px] leading-[30px] text-[#1c1f23] tracking-tight m-0">
              GMV Overview
            </h2>
            <button
              type="button"
              className="text-[#008060] font-medium text-[14px] bg-transparent hover:bg-[#f0f9f6] px-[12px] py-[6px] rounded-[8px] flex items-center gap-[6px] transition-all border-0 cursor-pointer"
              onClick={handleViewDetails}
            >
              View Details
              <ChevronRightIcon />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] sm:gap-[20px]">
            <div className="flex flex-col gap-[12px] sm:gap-[16px]">
              <span className="font-sans font-normal text-[14px] leading-[22.4px] text-[#5c6166] tracking-normal">
                Total GMV
              </span>
              <h3 className="font-sans font-semibold text-[28px] leading-[42px] text-[#1c1f23] tracking-wide m-0">
                {realOverview.totalGmv}
              </h3>
              <span className="font-sans font-normal text-[14px] leading-[22.4px] text-[#108043] tracking-normal">
                {realOverview.gmvTrend} {realOverview.gmvTrendLabel}
              </span>
            </div>
            <div className="flex flex-col gap-[16px]">
              <span className="font-sans font-normal text-[14px] leading-[22.4px] text-[#5c6166] tracking-normal">
                Active Offers
              </span>
              <h3 className="font-sans font-semibold text-[28px] leading-[42px] text-[#1c1f23] tracking-wide m-0">
                {realOverview.activeOffers}
              </h3>
              <span className="font-sans font-normal text-[14px] leading-[22.4px] text-[#108043] tracking-normal">
                {realOverview.activeOffersTrend}
              </span>
            </div>
            <div className="flex flex-col gap-[16px]">
              <span className="font-sans font-normal text-[14px] leading-[22.4px] text-[#5c6166] tracking-normal">
                Avg. Conversion
              </span>
              <h3 className="font-sans font-semibold text-[28px] leading-[42px] text-[#1c1f23] tracking-wide m-0">
                {realOverview.avgConversion}
              </h3>
              <span
                className={`font-sans font-normal text-[14px] leading-[22.4px] tracking-normal ${realOverview.conversionTrendColor}`}
              >
                {realOverview.conversionTrendLabel}
              </span>
            </div>
          </div>

          <div className="mt-[24px] pt-[20px] border-t border-[#dfe3e8]">
            <h3 className="font-sans font-medium text-[16px] leading-[24px] text-[#1c1f23] tracking-normal mb-[16px]">
              GMV Trend (Last 7 Days)
            </h3>
            <BasicLineChart
              Xdata={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
              Ydata={[120, 200, 150, 80, 70, 110, 130]}
              height={260}
            />
          </div>
        </div>

        {/* Theme Extension Widget */}
        <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[24px]">
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="font-sans font-semibold text-[20px] leading-[30px] text-[#1c1f23] tracking-tight m-0">
              Theme extension
            </h2>
            <div
              className={`flex items-center gap-[6px] px-[8px] py-[4px] rounded-[4px] ${themeExtensionEnabled ? "bg-[#d1f7c4]" : "bg-[#f4f6f8]"}`}
            >
              <div
                className={`w-[8px] h-[8px] rounded-full ${themeExtensionEnabled ? "bg-[#108043]" : "bg-[#6d7175]"}`}
              />
              <span
                className={`font-sans font-medium text-[14px] leading-[21px] tracking-normal ${themeExtensionEnabled ? "text-[#108043]" : "text-[#5c6166]"}`}
              >
                {themeExtensionEnabled ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <p className="font-sans font-normal text-[16px] leading-[25.6px] text-[#1c1f23] tracking-normal mb-[20px]">
            {themeExtensionEnabled
              ? "Bundles widget is visible in product pages."
              : "Bundles widget is currently disabled."}
          </p>
          <p className="font-sans font-normal text-[13px] leading-[20px] text-[#5c6166] tracking-[-0.1px] mb-[12px]">
            This opens Theme Editor App Embeds. Toggle the extension there and
            click Save in Shopify.
          </p>
          <div className="flex flex-col gap-[12px]">
            <button
              type="button"
              onClick={handleThemeExtensionToggle}
              className={`px-[16px] py-[8px] rounded-[6px] font-sans font-medium text-[14px] leading-[21px] tracking-normal cursor-pointer transition-colors w-full border-0 ${
                themeExtensionEnabled
                  ? "bg-white border border-[#dfe3e8] text-[#d72c0d] hover:bg-[#fef3f2]"
                  : "bg-[#008060] text-white hover:bg-[#006e52]"
              }`}
            >
              {themeExtensionEnabled ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              className="bg-white border border-[#dfe3e8] px-[16px] py-[8px] rounded-[6px] font-sans font-medium text-[14px] leading-[21px] text-[#1c1f23] tracking-normal cursor-pointer hover:bg-[#f4f6f8] transition-colors w-full"
              onClick={handleNeedHelp}
            >
              Need help?
            </button>
          </div>
        </div>
      </div>

      {/* My Offers Card */}
      <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[20px] sm:p-[24px] mb-[24px] sm:mb-[36px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[16px]">
          <h2 className="font-sans font-semibold text-[16px] leading-[24px] text-[#1c1f23] tracking-tight m-0">
            My Offers
          </h2>
          <button
            type="button"
            className="w-full sm:w-auto bg-[#008060] text-white px-[16px] py-[8px] rounded-[8px] font-medium text-[14px] shadow-sm hover:bg-[#006e52] transition-all border-0 cursor-pointer"
            onClick={handleCreateOfferClick}
          >
            Create New Offer
          </button>
        </div>

        <table className="hidden md:table w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Offer Name
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Status
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Exposure PV
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Add to Cart PV
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                GMV
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Conversion
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleOffers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-[12px] border-b border-[#f0f2f4] font-sans text-[14px] leading-[22.4px] text-[#5c6166] tracking-normal"
                >
                  No offers yet. Create your first offer to see it here.
                </td>
              </tr>
            ) : (
              visibleOffers.map((offer) => {
                const isToggling = getIsToggling(offer.id);
                const statusLabel = offer.isActive ? "Active" : "Paused";
                const gmvDisplay = `$${offer.gmv.toLocaleString()}`;
                const conversionDisplay = `${offer.conversion.toFixed(1)}%`;

                return (
                  <tr key={offer.id}>
                    <td className="p-[12px] border-b border-[#f0f2f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                      <div className="flex items-center gap-[8px]">
                        {offer.name}
                      </div>
                    </td>
                    <td className="p-[12px] border-b border-[#f0f2f4]">
                      <Form method="post">
                        <input
                          type="hidden"
                          name="intent"
                          value="toggle-offer-status"
                        />
                        <input type="hidden" name="offerId" value={offer.id} />
                        <input
                          type="hidden"
                          name="nextStatus"
                          value={offer.isActive ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          disabled={isToggling}
                          className={`flex items-center gap-[8px] bg-transparent border-0 p-0 cursor-pointer ${
                            isToggling ? "opacity-70 cursor-default" : ""
                          }`}
                        >
                          <span
                            className={`relative inline-block w-[44px] h-[24px] rounded-[12px] transition-colors duration-200 ${
                              isToggling ? "animate-pulse" : ""
                            }`}
                            style={{
                              backgroundColor: offer.isActive
                                ? "#008060"
                                : "#c4cdd5",
                            }}
                          >
                            <span
                              className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all duration-200 ${
                                isToggling ? "animate-pulse" : ""
                              }`}
                              style={{ left: offer.isActive ? "22px" : "2px" }}
                            />
                          </span>
                          <span
                            className="text-[14px] font-medium"
                            style={{
                              color: offer.isActive ? "#108043" : "#6d7175",
                            }}
                          >
                            {isToggling ? "Updating..." : statusLabel}
                          </span>
                        </button>
                      </Form>
                    </td>
                    <td className="p-[12px] border-b border-[#f0f2f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                      {offer.exposurePV.toLocaleString()}
                    </td>
                    <td className="p-[12px] border-b border-[#f0f2f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                      {offer.addToCartPV.toLocaleString()}
                    </td>
                    <td className="p-[12px] border-b border-[#f0f2f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                      {gmvDisplay}
                    </td>
                    <td className="p-[12px] border-b border-[#f0f2f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                      {conversionDisplay}
                    </td>
                    <td className="p-[12px] border-b border-[#f0f2f4]">
                      <div className="flex items-center gap-[8px]">
                        <button
                          type="button"
                          className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[6px] rounded-[6px] hover:bg-[#f0f9f6] transition-all"
                          title="View Details"
                          onClick={handleViewAllOffers}
                        >
                          <ChartBar size={16} />
                        </button>
                        <button
                          type="button"
                          className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[6px] rounded-[6px] hover:bg-[#f0f9f6] transition-all"
                          title="Edit"
                          onClick={() => {
                            setEditingOfferId(offer.id);
                            setShowCreateOffer(true);
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[6px] rounded-[6px] hover:bg-[#fef3f2] transition-all"
                          title="Delete"
                          onClick={() => setDeletingOffer(offer)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="md:hidden space-y-[12px]">
          {visibleOffers.length === 0 ? (
            <div className="border border-[#dfe3e8] rounded-[8px] p-[16px] text-[14px] text-[#5c6166] font-sans">
              No offers yet. Create your first offer to see it here.
            </div>
          ) : (
            visibleOffers.map((offer) => {
              const isToggling = getIsToggling(offer.id);
              const statusLabel = offer.isActive ? "Active" : "Paused";
              const gmvDisplay = `$${offer.gmv.toLocaleString()}`;
              const conversionDisplay = `${offer.conversion.toFixed(1)}%`;

              return (
                <div
                  key={offer.id}
                  className="border border-[#dfe3e8] rounded-[8px] p-[16px]"
                >
                  <div className="flex items-start justify-between mb-[12px]">
                    <div className="flex items-center gap-[8px] flex-wrap">
                      <span className="font-sans font-medium text-[16px] text-[#1c1f23]">
                        {offer.name}
                      </span>
                    </div>
                  </div>
                  <Form method="post">
                    <input
                      type="hidden"
                      name="intent"
                      value="toggle-offer-status"
                    />
                    <input type="hidden" name="offerId" value={offer.id} />
                    <input
                      type="hidden"
                      name="nextStatus"
                      value={offer.isActive ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      disabled={isToggling}
                      className={`flex items-center gap-[8px] mb-[12px] bg-transparent border-0 p-0 cursor-pointer ${
                        isToggling ? "opacity-70 cursor-default" : ""
                      }`}
                    >
                      <span
                        className={`relative inline-block w-[44px] h-[24px] rounded-[12px] transition-colors duration-200 ${
                          isToggling ? "animate-pulse" : ""
                        }`}
                        style={{
                          backgroundColor: offer.isActive
                            ? "#008060"
                            : "#c4cdd5",
                        }}
                      >
                        <span
                          className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all duration-200 ${
                            isToggling ? "animate-pulse" : ""
                          }`}
                          style={{ left: offer.isActive ? "22px" : "2px" }}
                        />
                      </span>
                      <span
                        className="text-[14px] font-medium"
                        style={{
                          color: offer.isActive ? "#108043" : "#6d7175",
                        }}
                      >
                        {isToggling ? "Updating..." : statusLabel}
                      </span>
                    </button>
                  </Form>
                  <div className="grid grid-cols-2 gap-[12px] mb-[12px]">
                    <div>
                      <div className="text-[12px] text-[#5c6166] mb-[4px]">
                        GMV
                      </div>
                      <div className="text-[14px] font-medium text-[#1c1f23]">
                        {gmvDisplay}
                      </div>
                    </div>
                    <div>
                      <div className="text-[12px] text-[#5c6166] mb-[4px]">
                        Conversion
                      </div>
                      <div className="text-[14px] font-medium text-[#1c1f23]">
                        {conversionDisplay}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-[8px] pt-[12px] border-t border-[#dfe3e8]">
                    <button
                      type="button"
                      className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[8px] hover:bg-[#f0f9f6] transition-all"
                      title="View Details"
                      onClick={handleViewAllOffers}
                    >
                      <ChartBar size={18} />
                    </button>
                    <button
                      type="button"
                      className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[8px] hover:bg-[#f0f9f6] transition-all"
                      title="Edit"
                      onClick={() => {
                        setEditingOfferId(offer.id);
                        setShowCreateOffer(true);
                      }}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[8px] rounded-[8px] hover:bg-[#fef3f2] transition-all"
                      title="Delete"
                      onClick={() => setDeletingOffer(offer)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-center mt-[16px] sm:mt-[20px] pt-[16px] border-t border-[#dfe3e8]">
          <button
            type="button"
            className="text-[#008060] font-medium text-[14px] bg-transparent hover:bg-[#f0f9f6] px-[16px] py-[8px] rounded-[8px] transition-all border-0 cursor-pointer"
            onClick={handleViewAllOffers}
          >
            View All Offers
          </button>
        </div>
      </div>

      {/* A/B Tests Card - Temporarily hidden */}
      {false && (
        <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[20px] sm:p-[24px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[16px]">
            <h2 className="font-sans font-semibold text-[16px] leading-[24px] text-[#1c1f23] tracking-tight m-0">
              A/B Tests
            </h2>
            <button
              type="button"
              className="w-full sm:w-auto bg-[#008060] text-white px-[16px] py-[8px] rounded-[8px] font-medium text-[14px] shadow-sm hover:bg-[#006e52] transition-all border-0 cursor-pointer"
              onClick={handleCreateAbTest}
            >
              Create A/B Test
            </button>
          </div>

          <table className="hidden md:table w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                  Test Name
                </th>
                <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                  Status
                </th>
                <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                  Variants
                </th>
                <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                  PV
                </th>
                <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                  Extra GMV
                </th>
                <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                  GMV Improvement
                </th>
                <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                  Days Running
                </th>
                <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                  Confidence
                </th>
                <th className="text-left p-[12px] border-b border-[#f0f2f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {mockAbTests.map((test) => (
                <tr key={test.id}>
                  <td className="p-[12px] border-b border-[#f0f2f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                    {test.name}
                  </td>
                  <td className="p-[12px] border-b border-[#f0f2f4]">
                    <div className="flex items-center gap-[8px]">
                      <span
                        className="relative inline-block w-[44px] h-[24px] rounded-[12px] cursor-pointer"
                        style={{
                          backgroundColor:
                            test.status === "Running" ? "#008060" : "#c4cdd5",
                        }}
                      >
                        <span
                          className="absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                          style={{
                            left: test.status === "Running" ? "22px" : "2px",
                          }}
                        />
                      </span>
                      <span
                        className="text-[14px] font-medium"
                        style={{
                          color:
                            test.status === "Running" ? "#108043" : "#6d7175",
                        }}
                      >
                        {test.status}
                      </span>
                    </div>
                  </td>
                  <td className="p-[12px] border-b border-[#f0f2f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                    {test.variant}
                  </td>
                  <td className="p-[12px] border-b border-[#f0f2f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                    {test.pv}
                  </td>
                  <td className="p-[12px] border-b border-[#f0f2f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                    {test.extraGMV}
                  </td>
                  <td className="p-[12px] border-b border-[#f0f2f4]">
                    <span
                      className="font-sans font-semibold text-[14px] leading-[22.4px] tracking-normal flex items-center gap-[4px]"
                      style={{
                        color: test.improvement >= 0 ? "#108043" : "#d72c0d",
                      }}
                    >
                      {test.improvement >= 0 ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )}
                      {Math.abs(test.improvement)}%
                    </span>
                  </td>
                  <td className="p-[12px] border-b border-[#f0f2f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#5c6166] tracking-normal">
                    {test.daysRunning} days
                  </td>
                  <td className="p-[12px] border-b border-[#f0f2f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                    <span
                      style={{
                        color:
                          test.confidence >= 95
                            ? "#108043"
                            : test.confidence >= 80
                              ? "#6d7175"
                              : "#d72c0d",
                        fontWeight: test.confidence >= 95 ? 600 : 400,
                      }}
                    >
                      {test.confidence}%
                    </span>
                  </td>
                  <td className="p-[12px] border-b border-[#f0f2f4]">
                    <div className="flex items-center gap-[8px]">
                      <button
                        type="button"
                        className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[6px] rounded-[6px] hover:bg-[#f0f9f6] transition-all"
                        title="View Details"
                      >
                        <ChartBar size={16} />
                      </button>
                      <button
                        type="button"
                        className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[6px] rounded-[6px] hover:bg-[#f0f9f6] transition-all"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[6px] rounded-[6px] hover:bg-[#fef3f2] transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden space-y-[12px]">
            {mockAbTests.map((test) => (
              <div
                key={test.id}
                className="border border-[#dfe3e8] rounded-[8px] p-[16px]"
              >
                <div className="mb-[12px]">
                  <span className="font-sans font-medium text-[16px] text-[#1c1f23]">
                    {test.name}
                  </span>
                </div>
                <div className="flex items-center gap-[8px] mb-[12px]">
                  <span
                    className="relative inline-block w-[44px] h-[24px] rounded-[12px]"
                    style={{
                      backgroundColor:
                        test.status === "Running" ? "#008060" : "#c4cdd5",
                    }}
                  >
                    <span
                      className="absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                      style={{
                        left: test.status === "Running" ? "22px" : "2px",
                      }}
                    />
                  </span>
                  <span
                    className="text-[14px] font-medium"
                    style={{
                      color: test.status === "Running" ? "#108043" : "#6d7175",
                    }}
                  >
                    {test.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-[12px] mb-[12px]">
                  <div>
                    <div className="text-[12px] text-[#5c6166] mb-[4px]">
                      PV
                    </div>
                    <div className="text-[14px] font-medium text-[#1c1f23]">
                      {test.pv}
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] text-[#5c6166] mb-[4px]">
                      Extra GMV
                    </div>
                    <div className="text-[14px] font-medium text-[#1c1f23]">
                      {test.extraGMV}
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] text-[#5c6166] mb-[4px]">
                      GMV Improvement
                    </div>
                    <div
                      className={`text-[14px] font-medium ${test.improvement > 0 ? "text-[#108043]" : "text-[#d72c0d]"}`}
                    >
                      {test.improvement > 0 ? "↑" : "↓"}{" "}
                      {Math.abs(test.improvement)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] text-[#5c6166] mb-[4px]">
                      Confidence
                    </div>
                    <div className="text-[14px] font-medium text-[#1c1f23]">
                      {test.confidence}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-[8px] pt-[12px] border-t border-[#dfe3e8]">
                  <button
                    type="button"
                    className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[8px] hover:bg-[#f0f9f6] transition-all"
                    title="View Details"
                  >
                    <ChartBar size={18} />
                  </button>
                  <button
                    type="button"
                    className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[8px] hover:bg-[#f0f9f6] transition-all"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[8px] rounded-[8px] hover:bg-[#fef3f2] transition-all"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-[16px] sm:mt-[20px] pt-[16px] border-t border-[#dfe3e8]">
            <button
              type="button"
              className="text-[#008060] font-medium text-[14px] bg-transparent hover:bg-[#f0f9f6] px-[16px] py-[8px] rounded-[8px] transition-all border-0 cursor-pointer"
              onClick={handleViewAllAbTests}
            >
              View All A/B Tests
            </button>
          </div>
        </div>
      )}

      {deletingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.4)]">
          <div className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-w-[400px] w-[90%] p-[24px]">
            <h2 className="font-sans font-semibold text-[18px] leading-[27px] text-[#1c1f23] mb-[8px]">
              Delete offer
            </h2>
            <p className="font-sans text-[14px] leading-[21px] text-[#5c6166] mb-[16px]">
              Are you sure you want to delete offer{" "}
              <span className="font-semibold text-[#1c1f23]">
                {deletingOffer.name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-[8px]">
              <button
                type="button"
                className="px-[12px] py-[6px] rounded-[6px] border border-[#dfe3e8] bg-white text-[#1c1f23] text-[14px] font-sans hover:bg-[#f4f6f8]"
                onClick={() => setDeletingOffer(null)}
              >
                Cancel
              </button>
              <Form method="post">
                <input type="hidden" name="intent" value="delete-offer" />
                <input type="hidden" name="offerId" value={deletingOffer.id} />
                <button
                  type="submit"
                  className="px-[12px] py-[6px] rounded-[6px] bg-[#d72c0d] text-white text-[14px] font-sans hover:bg-[#bc2200]"
                >
                  Delete
                </button>
              </Form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
