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
