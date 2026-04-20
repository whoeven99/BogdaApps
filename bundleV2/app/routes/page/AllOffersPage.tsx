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
  const handleDelete = () => {};

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
        <div className="bg-[#fff4f4] border border-[#ffc9c9] rounded-[8px] p-[16px] mb-[24px] flex items-start justify-between">
          <div className="flex gap-[12px]">
            <div className="text-[#d72c0d] mt-[2px]">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-sans font-semibold text-[14px] leading-[20px] text-[#1c1f23] mb-[4px] m-0">
                Action required: Activate Theme Extension
              </h3>
              <p className="font-sans text-[14px] leading-[20px] text-[#5c6166] m-0">
                Your offer has been created, but it won't be visible on your store until you activate the theme extension.
              </p>
              <div className="mt-[12px]">
                <button
                  type="button"
                  onClick={handleThemeExtensionToggle}
                  className="bg-transparent text-[#1c1f23] px-[12px] py-[6px] rounded-[6px] font-normal text-[16px] border border-[#1c1f23] hover:bg-black/5 transition-all cursor-pointer"
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[24px]">
        <div>
          <h1 className="font-sans font-semibold text-[24px] leading-[32px] text-[#1c1f23] tracking-normal m-0">
            All Offers
          </h1>
          <p className="font-sans font-normal text-[14px] leading-[22.4px] text-[#5c6166] mt-[4px]">
            Manage all your bundle offers
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-[8px] sm:gap-[12px] w-full sm:w-auto">
          <button
            type="button"
            className="bg-transparent text-[#1c1f23] px-[16px] py-[8px] rounded-[8px] font-medium text-[14px] border border-[#c4cdd5] hover:bg-[#f4f6f8] transition-all cursor-pointer"
            onClick={handleShowGuide}
          >
            Show Guide
          </button>
          <button
            type="button"
            className="bg-[#008060] !text-white px-[16px] py-[8px] rounded-[8px] font-medium text-[14px] shadow-sm hover:bg-[#006e52] transition-all border-0 cursor-pointer"
            onClick={handleCreateOffer}
          >
            Create New Offer
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[24px]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Offer Name
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Display name
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Discount type
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Discount rules
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Status
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Create time
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Update time
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {offersLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#5c6166] font-sans"
                >
                  Loading offers...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#5c6166] font-sans"
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
                  <tr key={offer.id}>
                    <td className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#1c1f23] font-sans">
                      <div className="flex items-center gap-[8px]">
                        {offer.name}
                      </div>
                    </td>
                    <td className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#1c1f23] font-sans">
                      {offer.cartTitle}
                    </td>
                    <td className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#1c1f23] font-sans">
                      {displayType}
                    </td>
                    <td className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#1c1f23] font-sans">
                      {rulesText}
                    </td>
                    <td className="p-[12px] border-b border-[#f0f2f4]">
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
                    <td className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#1c1f23] font-sans">
                      {formatTime(offer.createdAt)}
                    </td>
                    <td className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#1c1f23] font-sans">
                      {formatTime(offer.updatedAt)}
                    </td>
                    <td className="p-[12px] border-b border-[#f0f2f4]">
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