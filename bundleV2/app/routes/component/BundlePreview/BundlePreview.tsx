import type { ProgressiveGiftsConfig } from "../../../utils/offerParsing";
import {
  type CheckboxUpsellPreview,
  type ProductBundlePreview,
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
  productBundlePreview?: ProductBundlePreview | null;
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
  productBundlePreview,
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
    productBundlePreview,
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
    <div className="ciwi-bundle-preview-wrap">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {prog ? <div dangerouslySetInnerHTML={{ __html: prog }} /> : null}
    </div>
  );
}
