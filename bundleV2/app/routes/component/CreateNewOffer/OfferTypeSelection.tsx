import { Button } from "antd";
import type { OfferTypeId } from "./offerTypeOptions";
import {
  AdminPageHeader,
  adminSurfaceCardClass,
} from "../adminUi";
import StarterTemplatePicker from "./StarterTemplatePicker";

interface OfferTypeSelectionProps {
  onBack?: () => void;
  onSelect: (offerType: OfferTypeId) => void;
}

export function OfferTypeSelection({
  onBack,
  onSelect,
}: OfferTypeSelectionProps) {
  return (
    <div className={`${adminSurfaceCardClass} p-[20px] sm:p-[24px]`}>
      <div className="mb-[20px]">
        <Button
          type="text"
          className="px-0 text-gray-600 hover:text-gray-900"
          onClick={(e) => {
            onBack?.();
            e.preventDefault();
          }}
        >
          ← Back
        </Button>
        <div className="mt-[8px]">
          <AdminPageHeader title="Choose Starter Template" />
          <p className="mt-[8px] mb-0 max-w-[760px] text-[13px] leading-[20px] text-[#5c6166]">
            Start from the template that is closest to your campaign. You can
            still switch the core logic and add optional components later in the
            same configuration flow.
          </p>
        </div>
      </div>
      <StarterTemplatePicker
        selectedOfferType="quantity-breaks-same"
        onSelect={onSelect}
        actionLabel="Use Template"
      />
    </div>
  );
}
