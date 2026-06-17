// AllOffersPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/tailwind.css";
import { Trash2, Pencil } from "lucide-react";
import { Form, useFetcher, useNavigate, useNavigation, useSearchParams, useActionData } from "react-router";
import type { IndexLoaderData, ThemeEditorTarget } from "../_index/route";
import {
  getOfferDisplayType,
  getOfferRulesText,
  getOfferScheduleTimezone,
} from "../../utils/offerParsing";
import { openThemeEditor } from "../../utils/themeEditor";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  AdminEmptyState,
  AdminModal,
  AdminPageHeader,
  ThemeExtensionBanner,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSurfaceCardClass,
} from "../component/adminUi";

dayjs.extend(utc);
dayjs.extend(timezone);

type AllOffersRow = {
  id: string;
  name: string;
  cartTitle: string;
  offerType: string;
  discountRulesJson: string | null;
  offerSettingsJson: string | null;
  campaignConfigJson?: string | null;
  isActive: boolean;
  createdAt: string | Date | undefined;
  updatedAt: string | Date | undefined;
};

interface AllOffersPageProps {
  onCreateOffer?: () => void;
  onEditOffer?: (id: string) => void;
  offers?: IndexLoaderData["offers"];
  offersLoading?: boolean;
  shop?: string;
  ianaTimezone?: string;
  themeExtensionEnabled?: boolean;
  themeExtensionDetectionFailed?: boolean;
  themeEditorStoreId?: string;
  themeEditorThemeId?: string;
  apiKey?: string;
  themeTargets?: IndexLoaderData["themeTargets"];
  themeExtensionMatchedThemeId?: string;
}

function formatThemeTargetLabel(theme: ThemeEditorTarget): string {
  if (theme.role === "MAIN") {
    return `${theme.name} (Live)`;
  }
  if (theme.role === "UNPUBLISHED") {
    return `${theme.name} (Draft)`;
  }
  if (theme.role === "DEVELOPMENT") {
    return `${theme.name} (Development)`;
  }
  return `${theme.name} (${theme.role || "Theme"})`;
}

export function AllOffersPage({
  onCreateOffer,
  onEditOffer,
  offers = [],
  offersLoading = false,
  shop = "",
  ianaTimezone = "UTC",
  themeExtensionEnabled = false,
  themeExtensionDetectionFailed = false,
  themeEditorStoreId = "",
  themeEditorThemeId = "",
  apiKey = "",
  themeTargets = [],
  themeExtensionMatchedThemeId,
}: AllOffersPageProps) {
  const themeExtensionStatus = themeExtensionDetectionFailed
    ? "unknown"
    : themeExtensionEnabled
      ? "active"
      : "inactive";
  const themeExtensionBlocksOffers = themeExtensionStatus === "inactive";
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
      campaignConfigJson: offer.campaignConfigJson,
      isActive,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    };
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const actionData = useActionData() as
    | { toast?: string }
    | { _offerActionError: true; message: string }
    | undefined;
  const navigation = useNavigation();
  const deleteFetcher = useFetcher<
    | { success: true; toast?: string }
    | { _offerActionError: true; message: string }
  >();
  const handledDeleteToastRef = useRef<string | null>(null);
  const [deletingOffer, setDeletingOffer] = useState<AllOffersRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingToggleStatus, setPendingToggleStatus] = useState<Record<string, boolean>>({});
  const [submittingToggleIds, setSubmittingToggleIds] = useState<Set<string>>(() => new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(() => new Set());
  const [showThemeExtensionModal, setShowThemeExtensionModal] = useState(false);
  const preferredThemeTarget = useMemo(
    () =>
      themeTargets.find((theme) => theme.id === themeExtensionMatchedThemeId) ||
      themeTargets.find((theme) => theme.role === "MAIN") ||
      themeTargets.find((theme) => theme.role === "UNPUBLISHED") ||
      themeTargets[0] ||
      null,
    [themeExtensionMatchedThemeId, themeTargets],
  );
  const [selectedThemeId, setSelectedThemeId] = useState(
    preferredThemeTarget?.id || "",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortKey, setSortKey] = useState<"updated-desc" | "created-desc" | "name-asc">("updated-desc");
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

  const effectiveShop = themeEditorStoreId || shop;
  const defaultThemeEditorId =
    preferredThemeTarget?.editorId || preferredThemeTarget?.id || themeEditorThemeId;

  const handleThemeExtensionToggle = () => {
    if (!effectiveShop || !apiKey) return;
    if (themeTargets.length > 1) {
      setShowThemeExtensionModal(true);
      return;
    }
    openThemeEditor(effectiveShop, apiKey, {
      themeId: defaultThemeEditorId,
      openAppEmbed: true,
    });
  };

  const handleOpenSelectedTheme = () => {
    if (!effectiveShop || !apiKey) return;
    setShowThemeExtensionModal(false);
    openThemeEditor(effectiveShop, apiKey, {
      themeId: selectedThemeId || defaultThemeEditorId,
      openAppEmbed: true,
    });
  };

  const toast =
    searchParams.get("toast") ||
    (actionData && "toast" in actionData ? actionData.toast : undefined);
  const activeOffersCount = rows.filter((offer) => offer.isActive).length;
  const displayRows = useMemo(
    () =>
      rows.map((offer) => ({
        offer,
        displayType: getOfferDisplayType(
          offer.offerType,
          offer.campaignConfigJson,
          offer.offerSettingsJson,
        ),
        rulesText: getOfferRulesText({
          campaignConfigJson: offer.campaignConfigJson,
          discountRulesJson: offer.discountRulesJson,
          offerSettingsJson: offer.offerSettingsJson,
        }),
      })),
    [rows],
  );
  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const nextRows = displayRows.filter(({ offer, displayType, rulesText }) => {
      if (pendingDeleteIds.has(offer.id)) return false;
      const matchesSearch =
        !normalizedSearch ||
        offer.name.toLowerCase().includes(normalizedSearch) ||
        offer.cartTitle.toLowerCase().includes(normalizedSearch) ||
        displayType.toLowerCase().includes(normalizedSearch) ||
        rulesText.toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && offer.isActive) ||
        (statusFilter === "inactive" && !offer.isActive);
      return matchesSearch && matchesStatus;
    });

    nextRows.sort((a, b) => {
      if (sortKey === "name-asc") {
        return a.offer.name.localeCompare(b.offer.name);
      }
      if (sortKey === "created-desc") {
        return (
          new Date(b.offer.createdAt || 0).getTime() -
          new Date(a.offer.createdAt || 0).getTime()
        );
      }
      return (
        new Date(b.offer.updatedAt || 0).getTime() -
        new Date(a.offer.updatedAt || 0).getTime()
      );
    });

    return nextRows;
  }, [displayRows, searchTerm, statusFilter, sortKey, pendingDeleteIds]);

  useEffect(() => {
    if (toast?.startsWith("delete-success")) {
      setDeletingOffer(null);
      setDeleteError(null);
    }
    if (toast?.startsWith("toggle-success")) {
      setSubmittingToggleIds(new Set());
    }
  }, [toast]);

  useEffect(() => {
    if (deleteFetcher.state === "submitting") {
      setDeleteError(null);
      const id = deleteFetcher.formData?.get("offerId");
      if (typeof id === "string" && id) {
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
      return;
    }

    if (deleteFetcher.state !== "idle" || !deleteFetcher.data) return;

    if ("success" in deleteFetcher.data && deleteFetcher.data.success) {
      const deleteToast = deleteFetcher.data.toast || `delete-success-${Date.now()}`;
      if (handledDeleteToastRef.current === deleteToast) return;
      handledDeleteToastRef.current = deleteToast;
      setDeletingOffer(null);
      const next = new URLSearchParams(searchParams);
      next.set("toast", deleteToast);
      const qs = next.toString();
      navigate({ search: qs ? `?${qs}` : "" }, { replace: true });
      return;
    }

    if ("_offerActionError" in deleteFetcher.data && deleteFetcher.data._offerActionError) {
      setDeleteError(deleteFetcher.data.message);
      setPendingDeleteIds(new Set());
      return;
    }

    // 兜底：响应格式不匹配（例如网络错误、非预期响应等）
    setDeleteError("Something went wrong. Please try again.");
    setPendingDeleteIds(new Set());
  }, [deleteFetcher.state, deleteFetcher.data, deleteFetcher.formData, navigate, searchParams]);

  useEffect(() => {
    setSelectedThemeId((previous) => {
      if (previous && themeTargets.some((theme) => theme.id === previous)) {
        return previous;
      }
      return preferredThemeTarget?.id || "";
    });
  }, [preferredThemeTarget?.id, themeTargets]);

  useEffect(() => {
    if (navigation.state === "submitting" && navigation.formData) {
      const intent = navigation.formData.get("intent");
      const id = navigation.formData.get("offerId");
      if (intent === "toggle-offer-status" && typeof id === "string" && id) {
        const nextStatusRaw = navigation.formData.get("nextStatus");
        const nextStatus = String(nextStatusRaw || "").trim() === "true";
        setPendingToggleStatus((prev) => ({ ...prev, [id]: nextStatus }));
        setSubmittingToggleIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
      if (intent === "delete-offer" && typeof id === "string" && id) {
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
    }
  }, [navigation.state, navigation.formData]);

  useEffect(() => {
    if (!actionData) return;
    if (!("_offerActionError" in actionData) || !actionData._offerActionError) return;
    setPendingToggleStatus({});
    setSubmittingToggleIds(new Set());
    setPendingDeleteIds(new Set());
  }, [actionData]);

  useEffect(() => {
    setPendingToggleStatus((prev) => {
      const ids = Object.keys(prev);
      if (ids.length === 0) return prev;
      let next: Record<string, boolean> | null = null;
      for (const id of ids) {
        const desiredStatus = prev[id];
        const offer = rows.find((row) => row.id === id);
        if (!offer || offer.isActive === desiredStatus) {
          if (!next) next = { ...prev };
          delete next[id];
        }
      }
      return next ?? prev;
    });

    setPendingDeleteIds((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Set<string>();
      const rowIds = new Set(rows.map((row) => row.id));
      for (const id of prev) {
        if (rowIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rows]);

  const getIsToggling = (offerId: string) => submittingToggleIds.has(offerId);

  return (
    <div className="max-w-[1280px] mx-auto pb-[24px]">
      {themeExtensionBlocksOffers && !hideBanner && (
        <ThemeExtensionBanner
          onActivate={handleThemeExtensionToggle}
          onDismiss={handleCloseBanner}
        />
      )}

      <AdminPageHeader
        title="All Offers"
        subtitle="Search, review, and manage offer status from a single list built for routine merchant operations."
        meta={
          <>
            <span className="inline-flex items-center rounded-full bg-[#f6f6f7] px-[10px] py-[4px] text-[12px] font-medium text-[#5c6166]">
              {rows.length} total offers
            </span>
            <span className="inline-flex items-center rounded-full bg-[#f0f9f6] px-[10px] py-[4px] text-[12px] font-medium text-[#108043]">
              {activeOffersCount} active
            </span>
            <span className="inline-flex items-center rounded-full bg-[#fcfcfd] px-[10px] py-[4px] text-[12px] font-medium text-[#5c6166]">
              {filteredRows.length} shown
            </span>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className={adminSecondaryButtonClass}
              onClick={handleShowGuide}
            >
              Show Guide
            </button>
            <button
              type="button"
              className={adminPrimaryButtonClass}
              onClick={handleCreateOffer}
            >
              Create New Offer
            </button>
          </>
        }
      />

      {/* Table */}
      <div className={`${adminSurfaceCardClass} p-[20px] sm:p-[24px]`}>
        <div className="mb-[16px] flex flex-col gap-[12px]">
          <div>
            <h2 className="m-0 text-[18px] font-semibold leading-[28px] text-[#1c1f23]">
              Offer list
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-[12px] lg:grid-cols-[minmax(0,1fr)_180px_180px]">
            <label className="block text-[13px] font-medium text-[#1c1f23]">
              Search
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by offer name, display name, type, or rule summary"
                className="mt-[6px] w-full rounded-[8px] border border-[#dfe3e8] px-[12px] py-[9px] text-[14px] text-[#1c1f23] outline-none transition-colors placeholder:text-[#8c9196] focus:border-[#008060]"
              />
            </label>
            <label className="block text-[13px] font-medium text-[#1c1f23]">
              Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="mt-[6px] w-full rounded-[8px] border border-[#dfe3e8] bg-white px-[12px] py-[9px] text-[14px] text-[#1c1f23] outline-none focus:border-[#008060]"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="block text-[13px] font-medium text-[#1c1f23]">
              Sort by
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as "updated-desc" | "created-desc" | "name-asc")}
                className="mt-[6px] w-full rounded-[8px] border border-[#dfe3e8] bg-white px-[12px] py-[9px] text-[14px] text-[#1c1f23] outline-none focus:border-[#008060]"
              >
                <option value="updated-desc">Recently updated</option>
                <option value="created-desc">Recently created</option>
                <option value="name-asc">Name A-Z</option>
              </select>
            </label>
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
                <td colSpan={8} className="p-[12px] border-b border-[#eef1f4]">
                  <AdminEmptyState message="Loading offers..." />
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-[12px] border-b border-[#eef1f4]">
                  <AdminEmptyState message="No matching offers found. Adjust your search or filters." />
                </td>
              </tr>
            ) : (
              filteredRows.map(({ offer, displayType, rulesText }) => {
                const isToggling = getIsToggling(offer.id);
                const optimisticStatus = pendingToggleStatus[offer.id];
                const displayIsActive = themeExtensionBlocksOffers
                  ? false
                  : typeof optimisticStatus === "boolean"
                    ? optimisticStatus
                    : offer.isActive;
                const statusLabel = displayIsActive ? "Active" : "Inactive";

                const formatTime = (timeStr: string | Date | undefined) => {
                  if (!timeStr) return "-";
                  const d = dayjs(timeStr);
                  if (!d.isValid()) return "-";
                  const tz = getOfferScheduleTimezone({
                    campaignConfigJson: offer.campaignConfigJson,
                    offerSettingsJson: offer.offerSettingsJson,
                    fallback: ianaTimezone,
                  });
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
                            if (themeExtensionBlocksOffers) {
                              e.preventDefault();
                              setShowThemeExtensionModal(true);
                              return;
                            }
                            setPendingToggleStatus((prev) => ({
                              ...prev,
                              [offer.id]: offer.isActive ? false : true,
                            }));
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
        <AdminModal
          title="Delete offer"
          description={
            <>
              Are you sure you want to delete offer{" "}
              <span className="font-semibold text-[#1c1f23]">{deletingOffer.name}</span>
              ? This action cannot be undone.
              {deleteError ? (
                <div className="mt-3 rounded-[8px] border border-[#ffd6d2] bg-[#fff1f0] px-3 py-2 text-[12px] text-[#b42318]">
                  {deleteError}
                </div>
              ) : null}
            </>
          }
          actions={
            <>
              <button
                type="button"
                className="rounded-[6px] border border-[#dfe3e8] bg-white px-[12px] py-[6px] text-[14px] text-[#1c1f23] hover:bg-[#f4f6f8]"
                disabled={deleteFetcher.state !== "idle"}
                onClick={() => {
                  setDeletingOffer(null);
                  setDeleteError(null);
                }}
              >
                Cancel
              </button>
              <deleteFetcher.Form method="post">
                <input type="hidden" name="intent" value="delete-offer" />
                <input type="hidden" name="offerId" value={deletingOffer.id} />
                <button
                  type="submit"
                  disabled={deleteFetcher.state !== "idle"}
                  className="rounded-[6px] bg-[#d72c0d] px-[12px] py-[6px] text-[14px] text-white hover:bg-[#bc2200]"
                >
                  {deleteFetcher.state !== "idle" ? "Deleting..." : "Delete"}
                </button>
              </deleteFetcher.Form>
            </>
          }
        />
      )}

      {showThemeExtensionModal && (
        <AdminModal
          title="Open Theme Editor"
          description={
            <div className="space-y-3">
              <p className="m-0">
                Choose the live or draft theme you want to configure. In Shopify
                Theme Editor, you can enable the app embed or add the app block
                from the Apps panel on a product template.
              </p>
              {themeTargets.length > 0 ? (
                <label className="block">
                  <div className="mb-2 text-[12px] font-medium text-[#1c1f23]">
                    Theme
                  </div>
                  <select
                    value={selectedThemeId}
                    onChange={(event) => setSelectedThemeId(event.target.value)}
                    className="w-full rounded-[8px] border border-[#d0d5dd] bg-white px-3 py-2 text-[14px] text-[#1c1f23]"
                  >
                    {themeTargets.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {formatThemeTargetLabel(theme)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          }
          actions={
            <>
              <button
                type="button"
                className="rounded-[6px] border border-[#dfe3e8] bg-white px-[12px] py-[6px] text-[14px] text-[#1c1f23] hover:bg-[#f4f6f8]"
                onClick={() => setShowThemeExtensionModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleOpenSelectedTheme();
                }}
                className="rounded-[6px] bg-[#008060] px-[12px] py-[6px] text-[14px] text-white hover:bg-[#006e52]"
              >
                Open Theme Editor
              </button>
            </>
          }
        />
      )}
    </div>
  );
}
