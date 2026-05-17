import type { ProgressiveGiftsConfig } from "../../../utils/offerParsing";
import {
  type CheckboxUpsellPreview,
  renderBundlePreviewHtml,
  renderProgressiveGiftsPreviewHtml,
  type StickyAddToCartPreview,
  PreviewItem,
} from "./bundlePreviewShared";

type Props = {
  layoutFormat: "vertical" | "horizontal" | "card" | "compact";
  accentColor: string;
  cardBackgroundColor: string;
  borderColor?: string;
  labelColor?: string;
  titleFontSize?: number;
  titleFontWeight?: string;
  titleColor?: string;
  buttonText?: string;
  buttonPrimaryColor?: string;
  showCustomButton?: boolean;
  title?: string;
  items?: PreviewItem[];
  showProductImages?: boolean;
  /** 阶梯赠品配置（可选） */
  progressiveGifts?: ProgressiveGiftsConfig | null;
  /** 预览用：模拟当前 Bar 序号（与 __ciwi_bundle_tier 一致） */
  progressivePreviewBarIndex?: number;
  /** 预览用：模拟购物车行数量（at_count 解锁） */
  progressivePreviewLineQty?: number;
  showSubscriptionPreview?: boolean;
  subscriptionPreviewStyle?: "solid" | "dashed";
  subscriptionTitle?: string;
  subscriptionSubtitle?: string;
  showSubscriptionExplanation?: boolean;
  subscriptionExplanationTitle?: string;
  subscriptionExplanationBody?: string;
  checkboxUpsellPreview?: CheckboxUpsellPreview | null;
  stickyAddToCartPreview?: StickyAddToCartPreview | null;
};

export default function BundlePreview({
  layoutFormat,
  accentColor,
  cardBackgroundColor,
  borderColor,
  labelColor,
  titleFontSize,
  titleFontWeight,
  titleColor,
  buttonText,
  buttonPrimaryColor,
  showCustomButton,
  title = "Bundle & Save",
  items,
  showProductImages = true,
  progressiveGifts,
  progressivePreviewBarIndex = 1,
  progressivePreviewLineQty = 1,
  showSubscriptionPreview,
  subscriptionPreviewStyle,
  subscriptionTitle,
  subscriptionSubtitle,
  showSubscriptionExplanation,
  subscriptionExplanationTitle,
  subscriptionExplanationBody,
  checkboxUpsellPreview,
  stickyAddToCartPreview,
}: Props) {
  const html = renderBundlePreviewHtml({
    title,
    layoutFormat,
    accentColor,
    cardBackgroundColor,
    borderColor,
    labelColor,
    titleFontSize,
    titleFontWeight,
    titleColor,
    buttonText,
    buttonPrimaryColor,
    showCustomButton,
    items,
    showProductImages,
    showSubscriptionPreview,
    subscriptionPreviewStyle,
    subscriptionTitle,
    subscriptionSubtitle,
    showSubscriptionExplanation,
    subscriptionExplanationTitle,
    subscriptionExplanationBody,
    checkboxUpsellPreview,
    stickyAddToCartPreview,
  });

  const prog =
    progressiveGifts && progressiveGifts.enabled
      ? renderProgressiveGiftsPreviewHtml(
          progressiveGifts,
          progressivePreviewBarIndex,
          progressivePreviewLineQty,
        )
      : "";

  return (
    <div className="ciwi-theme-preview">
      <div className="ciwi-theme-preview__canvas">
        <div className="ciwi-theme-preview__header">
          <span className="ciwi-theme-preview__eyebrow">Product template</span>
          <span className="ciwi-theme-preview__status">In stock</span>
        </div>
        <div className="ciwi-theme-preview__title">Sample product details</div>
        <div className="ciwi-theme-preview__price-row">
          <span className="ciwi-theme-preview__price">€65,00</span>
          <span className="ciwi-theme-preview__compare">€79,00</span>
        </div>
        <div className="ciwi-theme-preview__options">
          <span className="ciwi-theme-preview__option">Default variant</span>
          <span className="ciwi-theme-preview__option">One-time purchase</span>
        </div>
        <div className="ciwi-bundle-preview-wrap">
          <div className="ciwi-bundle-wrapper">
            <div dangerouslySetInnerHTML={{ __html: html }} />
            {prog ? <div dangerouslySetInnerHTML={{ __html: prog }} /> : null}
          </div>
        </div>
        <div className="ciwi-theme-preview__actions">
          <button type="button" className="ciwi-theme-preview__primary-button">
            Add to cart
          </button>
          <div className="ciwi-theme-preview__secondary-button">Buy it now</div>
        </div>
      </div>
    </div>
  );
}
