// AllOffersPage.tsx
import { useEffect, useState } from "react";
import "../../styles/tailwind.css";
import { Trash2, Pencil } from "lucide-react";
import { Form, useNavigation, useSearchParams, useActionData } from "react-router";
import type { IndexLoaderData } from "../_index/route";

type AllOffersRow = {
  id: string;
  name: string;
  isActive: boolean;
  exposurePV: number;
  addToCartPV: number;
  gmv: number;
  conversion: number;
  createdAt: string;
};

interface AllOffersPageProps {
  onCreateOffer?: () => void;
  onEditOffer?: (id: string) => void;
  offers?: IndexLoaderData["offers"];
  offersLoading?: boolean;
}

export function AllOffersPage({
  onCreateOffer,
  onEditOffer,
  offers,
  offersLoading = false,
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
    const exposurePV = offer.exposurePV ?? 0;
    const addToCartPV = offer.addToCartPV ?? 0;
    const gmv = offer.gmv ?? 0;
    const conversion = offer.conversion ?? 0;
    const createdAt = offer.startTime ?? "";

    return {
      id: offer.id,
      name: offer.name,
    isActive,
      exposurePV,
      addToCartPV,
      gmv,
      conversion,
      createdAt,
    };
  });

  const [searchParams] = useSearchParams();
  const actionData = useActionData() as { toast?: string } | undefined;
  const navigation = useNavigation();
  const [deletingOffer, setDeletingOffer] = useState<AllOffersRow | null>(null);
  const [togglingIds, setTogglingIds] = useState<string[]>([]);

  const toast = searchParams.get("toast") || actionData?.toast;

  useEffect(() => {
    if (toast === "delete-success") {
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
                Status
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Exposure PV
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Add to Cart PV
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                GMV
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Conversion
              </th>
              <th className="text-left p-[12px] border-b border-[#f0f2f4] text-[13px] text-[#5c6166] font-sans font-semibold">
                Created
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
                const statusLabel = offer.isActive ? "Active" : "Paused";
                const gmvDisplay = `$${offer.gmv.toLocaleString()}`;
                const conversionDisplay = `${offer.conversion.toFixed(1)}%`;
                const createdDisplay = offer.createdAt
                  ? new Date(offer.createdAt).toISOString().slice(0, 10)
                  : "-";

                return (
                  <tr key={offer.id}>
                <td className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#1c1f23] font-sans">
                  <div className="flex items-center gap-[8px]">
                    {offer.name}
                  </div>
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
                      className={`flex items-center gap-[8px] bg-transparent border-0 p-0 cursor-pointer ${
                        isToggling ? "opacity-70 cursor-default" : ""
                      }`}
                    >
                      <span
                        className={`relative inline-block w-[44px] h-[24px] rounded-[12px] transition-colors duration-200 ${
                          isToggling ? "animate-pulse" : ""
                        }`}
                        style={{
                          backgroundColor: offer.isActive ? "#008060" : "#c4cdd5",
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
                        style={{
                          fontSize: 14,
                          color: offer.isActive ? "#108043" : "#6d7175",
                          fontWeight: 500,
                        }}
                      >
                        {isToggling ? "Updating..." : statusLabel}
                      </span>
                    </button>
                  </Form>
                </td>
                <td className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#1c1f23] font-sans">
                  {offer.exposurePV.toLocaleString()}
                </td>
                <td className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#1c1f23] font-sans">
                  {offer.addToCartPV.toLocaleString()}
                </td>
                <td className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#1c1f23] font-sans">
                  {gmvDisplay}
                </td>
                <td className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#1c1f23] font-sans">
                  {conversionDisplay}
                </td>
                <td className="p-[12px] border-b border-[#f0f2f4] text-[14px] text-[#5c6166] font-sans">
                  {createdDisplay}
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
                <input
                  type="hidden"
                  name="offerId"
                  value={deletingOffer.id}
                />
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
    </div>
  );
}