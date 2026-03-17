// AllOffersPage.tsx
import { useEffect, useState } from "react";
import "../styles/tailwind.css";
import { Trash2, Pencil } from "lucide-react";
import { Form, useSearchParams } from "react-router";
import type { IndexLoaderData } from "./_index/route";

type AllOffersRow = {
  id: string;
  name: string;
  status: string;
  exposurePV: number;
  addToCartPV: number;
  gmv: number;
  conversion: number;
  createdAt: string;
};

interface AllOffersPageProps {
  onCreateOffer?: () => void;
  offers?: IndexLoaderData["offers"];
}

export function AllOffersPage({ onCreateOffer, offers }: AllOffersPageProps) {
  const handleShowGuide = () => {};
  const handleCreateOffer = () => {
    if (onCreateOffer) {
      onCreateOffer();
    }
  };
  const handleEdit = () => {};
  const handleDelete = () => {};

  const rows: AllOffersRow[] = (offers ?? []).map((offer) => {
    const status = (offer.status ?? "Paused") as string;
    const exposurePV = offer.exposurePV ?? 0;
    const addToCartPV = offer.addToCartPV ?? 0;
    const gmv = offer.gmv ?? 0;
    const conversion = offer.conversion ?? 0;
    const createdAt = offer.startTime ?? "";

    return {
      id: offer.id,
      name: offer.name,
      status,
      exposurePV,
      addToCartPV,
      gmv,
      conversion,
      createdAt,
    };
  });

  const [searchParams] = useSearchParams();
  const [deletingOffer, setDeletingOffer] = useState<AllOffersRow | null>(null);

  const toast = searchParams.get("toast");

  useEffect(() => {
    if (toast === "delete-success") {
      setDeletingOffer(null);
    }
  }, [toast]);

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[16px] sm:mb-[24px]">
        <div>
          <h1 className="font-['Inter'] font-semibold text-[20px] sm:text-[24px] leading-[30px] sm:leading-[36px] text-[#202223] tracking-[0.0703px] m-0">
            All Offers
          </h1>
          <p className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] mt-[4px]">
            Manage all your bundle offers
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-[8px] sm:gap-[12px] w-full sm:w-auto">
          <button
            type="button"
            className="bg-[#f4f6f8] text-[#202223] px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border border-[#c4cdd5] cursor-pointer hover:bg-[#e4e5e7] transition-colors"
            onClick={handleShowGuide}
          >
            Show Guide
          </button>
          <button
            type="button"
            className="bg-[#008060] text-white px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border-0 cursor-pointer hover:bg-[#006e52] transition-colors"
            onClick={handleCreateOffer}
          >
            Create New Offer
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] text-[13px] text-[#6d7175] font-['Inter'] font-semibold">
                Offer Name
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] text-[13px] text-[#6d7175] font-['Inter'] font-semibold">
                Status
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] text-[13px] text-[#6d7175] font-['Inter'] font-semibold">
                Exposure PV
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] text-[13px] text-[#6d7175] font-['Inter'] font-semibold">
                Add to Cart PV
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] text-[13px] text-[#6d7175] font-['Inter'] font-semibold">
                GMV
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] text-[13px] text-[#6d7175] font-['Inter'] font-semibold">
                Conversion
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] text-[13px] text-[#6d7175] font-['Inter'] font-semibold">
                Created
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] text-[13px] text-[#6d7175] font-['Inter'] font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#6d7175] font-['Inter']"
                >
                  No offers yet. Create your first offer to see it here.
                </td>
              </tr>
            ) : (
              rows.map((offer) => {
                const isActive = offer.status.toLowerCase() === "active";
                const gmvDisplay = `$${offer.gmv.toLocaleString()}`;
                const conversionDisplay = `${offer.conversion.toFixed(1)}%`;
                const createdDisplay = offer.createdAt
                  ? new Date(offer.createdAt).toISOString().slice(0, 10)
                  : "-";

                return (
                  <tr key={offer.id}>
                <td className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#202223] font-['Inter']">
                  <div className="flex items-center gap-[8px]">
                    {offer.name}
                  </div>
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <div className="flex items-center gap-[8px]">
                    <span
                      className="relative inline-block w-[44px] h-[24px] rounded-[12px]"
                      style={{
                        backgroundColor:
                          isActive ? "#008060" : "#c4cdd5",
                      }}
                    >
                      <span
                        className="absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                        style={{ left: offer.status === "Active" ? "22px" : "2px" }}
                      />
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        color:
                          isActive
                            ? "#108043"
                            : "#6d7175",
                        fontWeight: 500,
                      }}
                    >
                      {offer.status || "Paused"}
                    </span>
                  </div>
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#202223] font-['Inter']">
                  {offer.exposurePV.toLocaleString()}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#202223] font-['Inter']">
                  {offer.addToCartPV.toLocaleString()}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#202223] font-['Inter']">
                  {gmvDisplay}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#202223] font-['Inter']">
                  {conversionDisplay}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#6d7175] font-['Inter']">
                  {createdDisplay}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <div className="flex items-center gap-[8px]">
                    <button
                      type="button"
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      onClick={handleEdit}
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[4px] rounded-[4px] hover:bg-[rgba(215,44,13,0.1)] transition-colors"
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
          <div className="bg-white rounded-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.24)] max-w-[400px] w-[90%] p-[20px]">
            <h2 className="font-['Inter'] font-semibold text-[18px] leading-[27px] text-[#202223] mb-[8px]">
              Delete offer
            </h2>
            <p className="font-['Inter'] text-[14px] leading-[21px] text-[#6d7175] mb-[16px]">
              Are you sure you want to delete offer{" "}
              <span className="font-semibold text-[#202223]">
                {deletingOffer.name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-[8px]">
              <button
                type="button"
                className="px-[12px] py-[6px] rounded-[6px] border border-[#dfe3e8] bg-white text-[#202223] text-[14px] font-['Inter'] hover:bg-[#f4f6f8]"
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
                  className="px-[12px] py-[6px] rounded-[6px] bg-[#d72c0d] text-white text-[14px] font-['Inter'] hover:bg-[#bc2200]"
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