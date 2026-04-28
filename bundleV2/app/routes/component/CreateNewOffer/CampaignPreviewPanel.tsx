import BundlePreview from "../BundlePreview/BundlePreview";
import type { PreviewItem } from "../BundlePreview/bundlePreviewShared";

type Props = {
  description?: string;
  countdownPreviewText?: string;
  layoutFormat: "vertical" | "horizontal" | "card" | "compact";
  cardBackgroundColor: string;
  accentColor: string;
  borderColor: string;
  labelColor: string;
  titleFontSize: number;
  titleFontWeight: string;
  titleColor: string;
  buttonText: string;
  buttonPrimaryColor: string;
  showCustomButton: boolean;
  title: string;
  items: PreviewItem[];
};

export default function CampaignPreviewPanel({
  description,
  countdownPreviewText,
  layoutFormat,
  cardBackgroundColor,
  accentColor,
  borderColor,
  labelColor,
  titleFontSize,
  titleFontWeight,
  titleColor,
  buttonText,
  buttonPrimaryColor,
  showCustomButton,
  title,
  items,
}: Props) {
  return (
    <div className="create-offer-sticky-preview">
      <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
        Live Preview
      </h3>
      {countdownPreviewText ? (
        <div className="mb-3 rounded-lg border border-[#ffe58f] bg-[#fffbe6] px-3 py-2 text-[12px] text-[#ad6800]">
          {countdownPreviewText}
        </div>
      ) : null}
      {description ? (
        <p className="text-[13px] text-[#5c6166] mb-6 font-normal">
          {description}
        </p>
      ) : null}
      <BundlePreview
        layoutFormat={layoutFormat}
        cardBackgroundColor={cardBackgroundColor}
        accentColor={accentColor}
        borderColor={borderColor}
        labelColor={labelColor}
        titleFontSize={titleFontSize}
        titleFontWeight={titleFontWeight}
        titleColor={titleColor}
        buttonText={buttonText}
        buttonPrimaryColor={buttonPrimaryColor}
        showCustomButton={showCustomButton}
        title={title}
        items={items}
      />
      <p className="text-[12px] text-[#5c6166] mt-3 italic font-normal">
        Note: This is a live preview. Changes will update in real-time when
        state is connected.
      </p>
    </div>
  );
}
