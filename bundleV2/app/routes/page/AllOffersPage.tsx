// AllOffersPage.tsx
import { useEffect, useState } from "react";
import "../../styles/tailwind.css";
import { Trash2, Pencil, X, AlertCircle } from "lucide-react";
import { Form, useNavigation, useSearchParams, useActionData } from "react-router";
import type { IndexLoaderData } from "../_index/route";
import { parseDiscountRules } from "../../utils/offerParsing";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

type AllOffersRow = {
  id: string;
  name: string;
  cartTitle: string;
  offerType: string;
  discountRulesJson: string | null;
  offerSettingsJson: string | null;
  isActive: boolean;
  createdAt: string | Date | undefined;
  updatedAt: string | Date | undefined;
};

interface AllOffersPageProps {
  onCreateOffer?: () => void;
  onEditOffer?: (id: string) => void;
  offers?: IndexLoaderData["offers"];
  offersLoading?: boolean;
  ianaTimezone?: string;
  themeExtensionEnabled?: boolean;
  shop?: string;
  apiKey?: string;
}

export function AllOffersPage({
  onCreateOffer,
  onEditOffer,
  offers = [],
  offersLoading = false,
  ianaTimezone = "UTC",
  themeExtensionEnabled = false,
  shop = "",
  apiKey = "",
}: AllOffersPageProps) {
  const surfaceCardClass =
    "rounded-[12px] border border-[#dfe3e8] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";
  const sectionActionClass =
    "inline-flex items-center justify-center rounded-[8px] border border-[#dfe3e8] bg-white px-[14px] py-[9px] text-[14px] font-medium text-[#1c1f23] transition-colors hover:bg-[#f6f6f7] cursor-pointer";
  const handleShowGuide = () => {};
  const handleCreateOffer = () => {
    if (onCreateOffer) {
      onCreateOffer();
    }
  };
  const handleEdit = (id: string) => {
    if (onEditOffer) {
      onEditOffer(id);
    }
  };

  const rows: AllOffersRow[] = (offers ?? []).map((offer) => {
    const isActive = !!offer.status;
    return {
      id: offer.id,
      name: offer.name,
      cartTitle: offer.cartTitle,
      offerType: offer.offerType,
      discountRulesJson: offer.discountRulesJson,
      offerSettingsJson: offer.offerSettingsJson,
      isActive,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    };
  });

  const [searchParams] = useSearchParams();
  const actionData = useActionData() as { toast?: string } | undefined;
  const navigation = useNavigation();
  const [deletingOffer, setDeletingOffer] = useState<AllOffersRow | null>(null);
  const [togglingIds, setTogglingIds] = useState<string[]>([]);
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

  const handleThemeExtensionToggle = () => {
    if (!shop || !apiKey) return;
    const storeHandle = shop.replace(".myshopify.com", "");
    const appEmbed = `${apiKey}/product_detail_message`;
    const editorUrl = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor?context=apps&appEmbed=${encodeURIComponent(appEmbed)}`;
    window.open(editorUrl, "_top");
  };

  const toast = searchParams.get("toast") || actionData?.toast;
  const activeOffersCount = rows.filter((offer) => offer.isActive).length;

  useEffect(() => {
    if (toast?.startsWith("delete-success")) {
      setDeletingOffer(null);
    }
  }, [toast]);

  useEffect(() => {
    if (navigation.state === "submitting" && navigation.formData) {
      const intent = navigation.formData.get("intent");
      const id = navigation.formData.get("offerId");
      if (intent === "toggle-offer-status" && typeof id === "string" && id) {
        setTogglingIds((prev) =>
          prev.includes(id) ? prev : [...prev, id],
        );
      }
    } else if (navigation.state === "idle" && togglingIds.length > 0) {
      const timer = setTimeout(() => {
        setTogglingIds([]);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [navigation.state, navigation.formData, togglingIds.length]);

  const getIsToggling = (offerId: string) => togglingIds.includes(offerId);

  return (
    <div className="max-w-[1280px] mx-auto pb-[24px]">
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

      {/* Header */}
      <div className="mb-[14px] flex flex-col gap-[12px] lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-[760px]">
          <h1 className="m-0 font-sans text-[24px] font-semibold leading-[32px] tracking-[-0.02em] text-[#1c1f23] sm:text-[28px] sm:leading-[36px]">
            All Offers
          </h1>
          <div className="mt-[8px] flex flex-wrap gap-[8px]">
            <span className="inline-flex items-center rounded-full bg-[#f6f6f7] px-[10px] py-[4px] text-[12px] font-medium text-[#5c6166]">
              {rows.length} total offers
            </span>
            <span className="inline-flex items-center rounded-full bg-[#f0f9f6] px-[10px] py-[4px] text-[12px] font-medium text-[#108043]">
              {activeOffersCount} active
            </span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-[10px] sm:w-auto sm:flex-row">
          <button
            type="button"
            className={sectionActionClass}
            onClick={handleShowGuide}
          >
            Show Guide
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[8px] border-0 bg-[#008060] px-[14px] py-[9px] text-[14px] font-medium text-white shadow-sm transition-all hover:bg-[#006e52] cursor-pointer"
            onClick={handleCreateOffer}
          >
            Create New Offer
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`${surfaceCardClass} p-[20px] sm:p-[24px]`}>
        <div className="mb-[12px] flex flex-col gap-[6px] sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="m-0 text-[18px] font-semibold leading-[28px] text-[#1c1f23]">
              Offer list
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full border-collapse overflow-hidden rounded-[10px]">
          <thead>
            <tr className="bg-[#f9fafb]">
              <th className="text-left p-[12px] border-b border-[#eef1f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Offer Name
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Display name
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Discount type
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Discount rules
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Status
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Create time
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Update time
              </th>
              <th className="text-left p-[12px] border-b border-[#eef1f4] text-[13px] text-[#5c6166] font-sans font-semibold">
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
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-[16px] border-b border-[#eef1f4] text-[14px] text-[#5c6166] font-sans"
                >
                  No offers yet. Create your first offer to see it here.
                </td>
              </tr>
            ) : (
              rows.map((offer) => {
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
                    <td className="p-[12px] border-b border-[#eef1f4] text-[14px] text-[#1c1f23] font-sans">
                      <div className="flex items-center gap-[8px]">
                        {offer.name}
                      </div>
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4] text-[14px] text-[#1c1f23] font-sans">
                      {offer.cartTitle}
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4] text-[14px] text-[#1c1f23] font-sans">
                      {displayType}
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4] text-[14px] text-[#1c1f23] font-sans">
                      {rulesText}
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4]">
                      <Form method="post">
                        <input type="hidden" name="intent" value="toggle-offer-status" />
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
                    <td className="p-[12px] border-b border-[#eef1f4] text-[14px] text-[#1c1f23] font-sans">
                      {formatTime(offer.createdAt)}
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4] text-[14px] text-[#1c1f23] font-sans">
                      {formatTime(offer.updatedAt)}
                    </td>
                    <td className="p-[12px] border-b border-[#eef1f4]">
                  <div className="flex items-center gap-[8px]">
                    <button
                      type="button"
                      className="text-[#8c9196] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[6px] rounded-[6px] hover:bg-[#f0f9f6] transition-all"
                      onClick={() => handleEdit(offer.id)}
                      title="Edit"
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
        </div>
      </div>

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
