// AllOffersPage.tsx
import "../styles/tailwind.css";
import { Copy, Trash2, Pencil, ChartBar } from "lucide-react";

const offers = [
  {
    id: 1,
    name: "Summer Bundle",
    status: "Active",
    gmv: "$12,430",
    conversion: "3.2%",
    exposurePV: "45,230",
    addToCartPV: "8,920",
    created: "2024-01-15",
  },
  {
    id: 2,
    name: "Winter Sale Pack",
    status: "Active",
    gmv: "$8,920",
    conversion: "2.8%",
    exposurePV: "38,150",
    addToCartPV: "7,200",
    created: "2024-01-20",
  },
  {
    id: 3,
    name: "Spring Collection",
    status: "Paused",
    gmv: "$5,640",
    conversion: "1.9%",
    exposurePV: "22,600",
    addToCartPV: "4,100",
    created: "2024-02-01",
  },
];

export function AllOffersPage() {
  const handleShowGuide = () => {};
  const handleCreateOffer = () => {};
  const handleAnalytics = () => {};
  const handleEdit = () => {};
  const handleCopy = () => {};
  const handleDelete = () => {};

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
            {offers.map((offer) => (
              <tr key={offer.id}>
                <td className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#202223] font-['Inter']">
                  <div className="flex items-center gap-[8px]">
                    {offer.name}
                    {offer.id <= 2 && (
                      <span className="bg-[#00A47C] text-white text-[10px] font-semibold py-[2px] px-[6px] rounded-[4px] uppercase tracking-wider">
                        NEW
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <div className="flex items-center gap-[8px]">
                    <span
                      className="relative inline-block w-[44px] h-[24px] rounded-[12px]"
                      style={{
                        backgroundColor:
                          offer.status === "Active" ? "#008060" : offer.status === "Paused" ? "#c4cdd5" : "#c4cdd5",
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
                          offer.status === "Active"
                            ? "#108043"
                            : offer.status === "Paused"
                            ? "#916a00"
                            : "#6d7175",
                        fontWeight: 500,
                      }}
                    >
                      {offer.status}
                    </span>
                  </div>
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#202223] font-['Inter']">
                  {offer.exposurePV}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#202223] font-['Inter']">
                  {offer.addToCartPV}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#202223] font-['Inter']">
                  {offer.gmv}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#202223] font-['Inter']">
                  {offer.conversion}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] text-[14px] text-[#6d7175] font-['Inter']">
                  {offer.created}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <div className="flex items-center gap-[8px]">
                    <button
                      type="button"
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      onClick={handleAnalytics}
                      title="Analytics"
                    >
                      <ChartBar size={16} />
                    </button>
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
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      onClick={handleCopy}
                      title="Copy"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      type="button"
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[4px] rounded-[4px] hover:bg-[rgba(215,44,13,0.1)] transition-colors"
                      onClick={handleDelete}
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
      </div>
    </div>
  );
}