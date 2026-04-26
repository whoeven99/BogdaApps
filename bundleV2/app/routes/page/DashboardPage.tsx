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
  Pencil,
  Trash2,
  Info,
  X,
  AlertCircle,
} from "lucide-react";
import "../../styles/tailwind.css";
import { CreateNewOffer } from "../component/CreateNewOffer/CreateNewOffer";
import type { IndexLoaderData } from "../_index/route";
import { parseDiscountRules } from "../../utils/offerParsing";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface DashboardPageProps {
  onViewAllOffers?: () => void;
  onViewAnalytics?: (offerId?: string) => void;
  onCreateOffer?: () => void;
  offers?: IndexLoaderData["offers"];
  offersLoading?: boolean;
  storeProducts?: IndexLoaderData["storeProducts"];
  markets?: IndexLoaderData["markets"];
  shop: string;
  apiKey: string;
  ianaTimezone: string;
  themeExtensionEnabled: boolean;
}

type DashboardOfferRow = {
  id: string;
  name: string;
  cartTitle: string;
  offerType: string;
  discountRulesJson: string | null;
  offerSettingsJson: string | null;
  isActive: boolean;
  createdAt: string | Date | undefined;
  updatedAt: string | Date | undefined;
  exposurePV: number;
  addToCartPV: number;
  gmv: number;
  conversion: number;
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
  offersLoading = false,
  storeProducts = [],
  markets = [],
  shop,
  apiKey,
  ianaTimezone,
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
  const [totalGmv, setTotalGmv] = useState(0);
  const [gmvGrowthRate, setGmvGrowthRate] = useState(0);
  const [bundleOrders, setBundleOrders] = useState(0);
  const [productViewed, setProductViewed] = useState(0);

  const [showThemeExtensionModal, setShowThemeExtensionModal] = useState(false);
  const [hideBanner, setHideBanner] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hideThemeExtensionBanner") === "true";
    }
    return false;
  });

  const handleCloseBanner = () => {
    setHideBanner(true);
    localStorage.setItem("hideThemeExtensionBanner", "true");
  };

  const offerRows: DashboardOfferRow[] = (offers ?? []).map((offer) => {
    const isActive = !!offer.status;
    const createdAt = offer.createdAt;
    const updatedAt = offer.updatedAt;
    const exposurePV = offer.exposurePV ?? 0;
    const addToCartPV = offer.addToCartPV ?? 0;
    const gmv = offer.gmv ?? 0;
    const conversion = offer.conversion ?? 0;

    return {
      id: offer.id,
      name: offer.name,
      cartTitle: offer.cartTitle,
      offerType: offer.offerType,
      discountRulesJson: offer.discountRulesJson,
      offerSettingsJson: offer.offerSettingsJson,
      isActive,
      createdAt,
      updatedAt,
      exposurePV,
      addToCartPV,
      gmv,
      conversion,
    };
  });

  const visibleOffers = offerRows.slice(0, 4);

  const gmvGrowthRateColor =
    gmvGrowthRate === 0 ? "#916a00" : gmvGrowthRate > 0 ? "#108043" : "#D93025";
  const gmvGrowthRateArrow = gmvGrowthRate >= 0 ? "↑" : "↓";

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
  const handleThemeExtensionToggle = () => {
    const storeHandle = shop.replace(".myshopify.com", "");
    const appEmbed = `${apiKey}/product_detail_message`;
    const editorUrl = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor?context=apps&appEmbed=${encodeURIComponent(appEmbed)}`;
    window.open(editorUrl, "_top");
  };

  const toast = searchParams.get("toast") || actionData?.toast;
  const surfaceCardClass =
    "rounded-[12px] border border-[#dfe3e8] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";
  const sectionActionClass =
    "inline-flex items-center gap-[6px] rounded-[8px] border-0 bg-transparent px-[12px] py-[6px] text-[14px] font-medium text-[#008060] transition-all hover:bg-[#f0f9f6] cursor-pointer";

  useEffect(() => {
    if (toast?.startsWith("delete-success")) {
      setDeletingOffer(null);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const overviewUrl = `/webpixerToAli?mode=dashboard-overview-gmv&shopName=${shop}`;
        const response = await fetch(overviewUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTotalGmv(data.totalGmv || 0);
            setGmvGrowthRate(data.gmvGrowthRate || 0);
          }
        }
      } catch (error) {
        console.error("Failed to fetch dashboard overview data", error);
      }
    };

    run();

    return () => controller.abort();
  }, [shop]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const bundleOrdersUrl = `/webpixerToAli?mode=dashboard-overview-bundle-orders&shopName=${shop}`;
        const productViewedUrl = `/webpixerToAli?mode=dashboard-overview-product-viewed&shopName=${shop}`;

        const [bundleOrdersResponse, productViewedResponse] = await Promise.all([
          fetch(bundleOrdersUrl),
          fetch(productViewedUrl),
        ]);

        if (bundleOrdersResponse.ok) {
          const data = await bundleOrdersResponse.json();
          if (data.success) {
            setBundleOrders(data.totalCount || 0);
          }
        }

        if (productViewedResponse.ok) {
          const data = await productViewedResponse.json();
          if (data.success) {
            setProductViewed(data.totalCount || 0);
          }
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      }
    };

    fetchData();
  }, [shop]);

  useEffect(() => {
    if (
      toast?.startsWith("create-success") ||
      toast?.startsWith("update-success") ||
      toast?.startsWith("delete-success")
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
          ianaTimezone={ianaTimezone}
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
      <div className="mb-[12px] sm:mb-[16px] flex flex-col gap-[12px] lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-[720px]">
          <h1 className="m-0 text-[24px] font-semibold leading-[32px] tracking-[-0.02em] text-[#1c1f23] sm:text-[28px] sm:leading-[36px]">
            Dashboard
          </h1>
        </div>
        <div className="flex flex-col gap-[10px] sm:flex-row">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[8px] border border-[#dfe3e8] bg-white px-[14px] py-[9px] text-[14px] font-medium text-[#1c1f23] transition-colors hover:bg-[#f6f6f7] cursor-pointer"
            onClick={handleViewDetails}
          >
            View analytics
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[8px] bg-[#008060] px-[14px] py-[9px] text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-[#006e52] border-0 cursor-pointer"
            onClick={handleCreateOfferClick}
          >
            Create New Offer
          </button>
        </div>
      </div>

      {!themeExtensionEnabled && !hideBanner && (
        <div className="mb-[24px] flex items-start justify-between rounded-[12px] border border-[#ffd5d2] bg-[#fff7f6] p-[16px] sm:p-[18px]">
          <div className="flex gap-[12px]">
            <div className="mt-[2px] text-[#d72c0d]">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="mb-[6px] inline-flex items-center rounded-full bg-[#ffe0db] px-[8px] py-[3px] text-[12px] font-medium text-[#b42318]">
                Action required
              </div>
              <h3 className="m-0 mb-[4px] font-sans text-[14px] font-semibold leading-[20px] text-[#1c1f23]">
                Activate Theme Extension
              </h3>
              <p className="m-0 font-sans text-[14px] leading-[20px] text-[#5c6166]">
                Offers stay hidden until the extension is enabled.
              </p>
              <div className="mt-[12px]">
                <button
                  type="button"
                  onClick={handleThemeExtensionToggle}
                  className="rounded-[8px] border border-[#1c1f23] bg-transparent px-[12px] py-[7px] text-[14px] font-medium text-[#1c1f23] transition-all hover:bg-black/5 cursor-pointer"
                >
                  Activate Theme Extension
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseBanner}
            className="text-[#5c6166] hover:text-[#1c1f23] bg-transparent border-0 cursor-pointer p-[4px]"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* GMV Overview + Theme Extension */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[16px] sm:gap-[24px] mb-[24px] sm:mb-[36px]">
        {/* GMV Overview Card */}
        <div className={`${surfaceCardClass} p-[20px] sm:p-[24px]`}>
          <div className="mb-[16px] flex items-start justify-between gap-[12px]">
            <div>
              <div className="mb-[6px] text-[12px] font-medium uppercase tracking-[0.08em] text-[#6d7175]">
                Last 30 days
              </div>
              <div className="flex items-center gap-[8px]">
                <h2 className="m-0 font-sans text-[20px] font-semibold leading-[30px] tracking-tight text-[#1c1f23]">
                GMV Overview
                </h2>
                <div className="group relative flex items-center">
                  <Info className="h-[16px] w-[16px] cursor-help text-[#8a919e]" />
                  <div className="absolute bottom-full left-1/2 z-10 mb-[8px] hidden w-max max-w-[250px] -translate-x-1/2 rounded-[8px] bg-[#1c1f23] px-[12px] py-[8px] text-center text-[12px] leading-[18px] text-white shadow-lg group-hover:block">
                    Data accumulated over the last 30 days
                    <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#1c1f23]"></div>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              className={sectionActionClass}
              onClick={handleViewDetails}
            >
              View Details
              <ChevronRightIcon />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-3 sm:gap-[16px]">
            <div className="rounded-[12px] border border-[#e9edf1] bg-[#fcfcfd] p-[16px]">
              <span className="font-sans text-[13px] font-medium leading-[20px] text-[#5c6166]">
                Total GMV
              </span>
              <h3 className="m-0 mt-[8px] font-sans text-[28px] font-semibold leading-[38px] text-[#1c1f23]">
                ${totalGmv.toFixed(2)}
              </h3>
              <span
                className="mt-[8px] block font-sans text-[13px] leading-[20px]"
                style={{
                  color: gmvGrowthRateColor,
                }}
              >
                {gmvGrowthRate !== 0 && `${gmvGrowthRateArrow} `}
                {gmvGrowthRate >= 0 ? "+" : ""}
                {Math.abs(gmvGrowthRate).toFixed(2)}% from last month
              </span>
            </div>
            <div className="rounded-[12px] border border-[#e9edf1] bg-[#fcfcfd] p-[16px]">
              <span className="font-sans text-[13px] font-medium leading-[20px] text-[#5c6166]">
                Bundle Orders
              </span>
              <h3 className="m-0 mt-[8px] font-sans text-[28px] font-semibold leading-[38px] text-[#1c1f23]">
                {bundleOrders}
              </h3>
              <span className="mt-[8px] block font-sans text-[13px] leading-[20px] text-[#5c6166]">
                Orders attributed to bundle purchases.
              </span>
            </div>
            <div className="rounded-[12px] border border-[#e9edf1] bg-[#fcfcfd] p-[16px]">
              <span className="font-sans text-[13px] font-medium leading-[20px] text-[#5c6166]">
                Avg. Conversion
              </span>
              <h3 className="m-0 mt-[8px] font-sans text-[28px] font-semibold leading-[38px] text-[#1c1f23]">
                {productViewed > 0
                  ? `${((bundleOrders / productViewed) * 100).toFixed(2)}%`
                  : "0.00%"}
              </h3>
              <span className="mt-[8px] block font-sans text-[13px] leading-[20px] text-[#5c6166]">
                Orders {bundleOrders} / Exposure {productViewed}
              </span>
            </div>
          </div>
        </div>

        {/* Theme Extension Widget */}
        <div className={`${surfaceCardClass} p-[20px] sm:p-[24px]`}>
          <div className="mb-[16px] flex items-start justify-between gap-[12px]">
            <div>
              <div className="mb-[6px] text-[12px] font-medium uppercase tracking-[0.08em] text-[#6d7175]">
                Storefront
            </div>
              <h2 className="m-0 font-sans text-[20px] font-semibold leading-[30px] tracking-tight text-[#1c1f23]">
                Theme extension
              </h2>
            </div>
            <button
              type="button"
              className={`inline-flex items-center gap-[6px] rounded-full px-[10px] py-[5px] text-[12px] font-semibold ${
                themeExtensionEnabled
                  ? "bg-[#e8f7ee] text-[#108043]"
                  : "bg-[#f4f6f8] text-[#5c6166]"
              }`}
            >
              <span
                className={`h-[8px] w-[8px] rounded-full ${
                  themeExtensionEnabled ? "bg-[#108043]" : "bg-[#6d7175]"
                }`}
              />
              {themeExtensionEnabled ? "Active" : "Inactive"}
            </button>
          </div>
          <p className="mb-[10px] font-sans text-[15px] leading-[24px] text-[#1c1f23]">
            {themeExtensionEnabled
              ? "Bundles widget is visible in product pages."
              : "Bundles widget is currently disabled."}
          </p>
          <p className="mb-[16px] font-sans text-[13px] leading-[20px] text-[#5c6166]">
            This opens Theme Editor App Embeds. Toggle the extension there and
            click Save in Shopify.
          </p>
          <div className="flex flex-col gap-[12px]">
            <button
              type="button"
              onClick={handleThemeExtensionToggle}
              className={`w-full rounded-[8px] border px-[16px] py-[9px] font-sans text-[14px] font-medium leading-[22px] cursor-pointer transition-colors ${
                themeExtensionEnabled
                  ? "border-[#dfe3e8] bg-white text-[#1c1f23] hover:bg-[#f6f6f7]"
                  : "border-[#1c1f23] bg-transparent text-[#1c1f23] hover:bg-black/5"
              }`}
            >
              {themeExtensionEnabled ? "Manage in Theme Editor" : "Enable in Theme Editor"}
            </button>
          </div>
        </div>
      </div>

      {/* My Offers Card */}
      <div className={`${surfaceCardClass} p-[20px] sm:p-[24px] mb-[24px] sm:mb-[36px]`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[16px]">
          <div>
            <h2 className="m-0 font-sans text-[18px] font-semibold leading-[28px] tracking-tight text-[#1c1f23]">
              My Offers
            </h2>
            <p className="mt-[6px] mb-0 text-[13px] leading-[20px] text-[#5c6166]">
              Review recent offers, update status, and jump into edits quickly.
            </p>
          </div>
          <div className="flex w-full flex-col gap-[10px] sm:w-auto sm:flex-row">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-[8px] border border-[#dfe3e8] bg-white px-[14px] py-[9px] text-[14px] font-medium text-[#1c1f23] transition-colors hover:bg-[#f6f6f7] cursor-pointer"
              onClick={handleViewAllOffers}
            >
              View All Offers
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-[8px] bg-[#008060] px-[14px] py-[9px] text-[14px] font-medium text-white shadow-sm transition-all hover:bg-[#006e52] border-0 cursor-pointer"
              onClick={handleCreateOfferClick}
            >
              Create New Offer
            </button>
          </div>
        </div>

        <table className="hidden md:table w-full border-collapse overflow-hidden rounded-[10px]">
          <thead>
            <tr className="bg-[#f9fafb]">
              <th className="text-left p-[12px] border-b border-[#eef1f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Offer Name
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Display name
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Discount type
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Discount rules
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Status
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Create time
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Update time
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] font-sans font-semibold text-[13px] leading-[20.8px] text-[#5c6166] tracking-normal">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {offersLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-[16px] border-b border-[#eef1f4] text-[14px] text-[#5c6166] font-sans"
                >
                  Loading offers...
                </td>
              </tr>
            ) : visibleOffers.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-[16px] border-b border-[#eef1f4] font-sans text-[14px] leading-[22.4px] text-[#5c6166] tracking-normal"
                >
                  No offers yet. Create your first offer to see it here.
                </td>
              </tr>
            ) : (
              visibleOffers.map((offer) => {
                const isToggling = getIsToggling(offer.id);
                const displayIsActive = themeExtensionEnabled ? offer.isActive : false;
                const statusLabel = displayIsActive ? "Active" : "Inactive";
                const displayType = offer.offerType === "quantity-breaks-same" ? "Quantity breaks" : offer.offerType;
                
                const rules = parseDiscountRules(offer.discountRulesJson);
                const rulesText = rules.length > 0 
                  ? rules.map(r => `Buy ${r.count} Get ${r.discountPercent}% Off`).join(", ")
                  : "-";
                  
                const formatTime = (timeStr: string | Date | undefined) => {
                  if (!timeStr) return "-";
                  const d = dayjs(timeStr);
                  if (!d.isValid()) return "-";
                  let tz = ianaTimezone;
                  try {
                    if (offer.offerSettingsJson) {
                      const parsed = JSON.parse(offer.offerSettingsJson);
                      if (parsed.scheduleTimezone) tz = parsed.scheduleTimezone;
                    }
                  } catch (e) {}
                  return d.tz(tz).format("YYYY-MM-DD HH:mm:ss") + ` (UTC${d.tz(tz).format('Z')})`;
                };

                return (
                  <tr key={offer.id} className="hover:bg-[#fafbfc]">
                    <td className="p-[12px] border-b border-[#eef1f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                      <div className="flex items-center gap-[8px]">
                        {offer.name}
                      </div>
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                      {offer.cartTitle}
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                      {displayType}
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                      {rulesText}
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4]">
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
                          onClick={(e) => {
                            if (!themeExtensionEnabled) {
                              e.preventDefault();
                              setShowThemeExtensionModal(true);
                            }
                          }}
                          className={`flex items-center gap-[8px] bg-transparent border-0 p-0 cursor-pointer ${
                            isToggling ? "opacity-70 cursor-default" : ""
                          }`}
                        >
                          <span
                            className={`relative inline-block w-[44px] h-[24px] rounded-[12px] transition-colors duration-200 ${
                              isToggling ? "animate-pulse" : ""
                            }`}
                            style={{
                              backgroundColor: displayIsActive
                                ? "#008060"
                                : "#c4cdd5",
                            }}
                          >
                            <span
                              className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all duration-200 ${
                                isToggling ? "animate-pulse" : ""
                              }`}
                              style={{ left: displayIsActive ? "22px" : "2px" }}
                            />
                          </span>
                          <span
                            className="text-[14px] font-medium"
                            style={{
                              color: displayIsActive ? "#108043" : "#6d7175",
                            }}
                          >
                            {isToggling ? "Updating..." : statusLabel}
                          </span>
                        </button>
                      </Form>
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                      {formatTime(offer.createdAt)}
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4] font-sans font-normal text-[14px] leading-[22.4px] text-[#1c1f23] tracking-normal">
                      {formatTime(offer.updatedAt)}
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4]">
                      <div className="flex items-center gap-[8px]">
                        {/* 
                        <button
                          type="button"
                          className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[6px] rounded-[6px] hover:bg-[#f0f9f6] transition-all"
                          title="View Details"
                          onClick={() => onViewAnalytics?.(offer.id)}
                        >
                          <ChartBar size={16} />
                        </button>
                        */}
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
          {offersLoading ? (
            <div className="border border-[#dfe3e8] rounded-[8px] p-[16px] text-[14px] text-[#5c6166] font-sans">
              Loading offers...
            </div>
          ) : visibleOffers.length === 0 ? (
            <div className="border border-[#dfe3e8] rounded-[8px] p-[16px] text-[14px] text-[#5c6166] font-sans">
              No offers yet. Create your first offer to see it here.
            </div>
          ) : (
            visibleOffers.map((offer) => {
              const isToggling = getIsToggling(offer.id);
              const displayIsActive = themeExtensionEnabled ? offer.isActive : false;
              const statusLabel = displayIsActive ? "Active" : "Inactive";
              const gmvDisplay = `$${offer.gmv.toLocaleString()}`;
              const conversionDisplay = `${offer.conversion.toFixed(1)}%`;

              return (
                <div
                  key={offer.id}
                  className="rounded-[12px] border border-[#dfe3e8] bg-[#fcfcfd] p-[16px]"
                >
                  <div className="flex items-start justify-between mb-[12px]">
                    <div className="flex items-center gap-[8px] flex-wrap">
                      <span className="font-sans font-medium text-[16px] text-[#1c1f23]">
                        {offer.name}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-[#f0f9f6] px-[8px] py-[3px] text-[12px] font-medium text-[#108043]">
                        {offer.offerType === "quantity-breaks-same"
                          ? "Quantity breaks"
                          : offer.offerType}
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
                      onClick={(e) => {
                        if (!themeExtensionEnabled) {
                          e.preventDefault();
                          setShowThemeExtensionModal(true);
                        }
                      }}
                      className={`flex items-center gap-[8px] mb-[12px] bg-transparent border-0 p-0 cursor-pointer ${
                        isToggling ? "opacity-70 cursor-default" : ""
                      }`}
                    >
                      <span
                        className={`relative inline-block w-[44px] h-[24px] rounded-[12px] transition-colors duration-200 ${
                          isToggling ? "animate-pulse" : ""
                        }`}
                        style={{
                          backgroundColor: displayIsActive
                            ? "#008060"
                            : "#c4cdd5",
                        }}
                      >
                        <span
                          className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all duration-200 ${
                            isToggling ? "animate-pulse" : ""
                          }`}
                          style={{ left: displayIsActive ? "22px" : "2px" }}
                        />
                      </span>
                      <span
                        className="text-[14px] font-medium"
                        style={{
                          color: displayIsActive ? "#108043" : "#6d7175",
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
                    {/* 
                    <button
                      type="button"
                      className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[8px] hover:bg-[#f0f9f6] transition-all"
                      title="View Details"
                      onClick={() => onViewAnalytics?.(offer.id)}
                    >
                      <ChartBar size={18} />
                    </button>
                    */}
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
            className={sectionActionClass}
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
              className="w-full sm:w-auto bg-[#008060] !text-white px-[16px] py-[8px] rounded-[8px] font-medium text-[14px] shadow-sm hover:bg-[#006e52] transition-all border-0 cursor-pointer"
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
                      {/*
                      <button
                        type="button"
                        className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[6px] rounded-[6px] hover:bg-[#f0f9f6] transition-all"
                        title="View Details"
                      >
                        <ChartBar size={16} />
                      </button>
                      */}
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
                  {/*
                  <button
                    type="button"
                    className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[8px] hover:bg-[#f0f9f6] transition-all"
                    title="View Details"
                  >
                    <ChartBar size={18} />
                  </button>
                  */}
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
                  className="px-[12px] py-[6px] rounded-[6px] bg-[#d72c0d] !text-white text-[14px] font-sans hover:bg-[#bc2200]"
                >
                  Delete
                </button>
              </Form>
            </div>
          </div>
        </div>
      )}

      {showThemeExtensionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.4)]">
          <div className="bg-white rounded-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-w-[400px] w-[90%] p-[24px]">
            <h2 className="font-sans font-semibold text-[18px] leading-[27px] text-[#1c1f23] mb-[8px]">
              Activate Theme Extension
            </h2>
            <p className="font-sans text-[14px] leading-[21px] text-[#5c6166] mb-[16px]">
              You need to activate the theme extension first before you can turn on any offers.
            </p>
            <div className="flex justify-end gap-[8px]">
              <button
                type="button"
                className="px-[12px] py-[6px] rounded-[6px] border border-[#dfe3e8] bg-white text-[#1c1f23] text-[14px] font-sans hover:bg-[#f4f6f8]"
                onClick={() => setShowThemeExtensionModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowThemeExtensionModal(false);
                  handleThemeExtensionToggle();
                }}
                className="px-[12px] py-[6px] rounded-[6px] bg-[#008060] !text-white text-[14px] font-sans hover:bg-[#006e52]"
              >
                Activate Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
