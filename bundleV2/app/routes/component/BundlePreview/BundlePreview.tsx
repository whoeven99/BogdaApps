import type { ProgressiveGiftsConfig } from "../../../utils/offerParsing";
import {
  renderBundlePreviewHtml,
  renderProgressiveGiftsPreviewHtml,
  PreviewItem,
  MultiProductPreviewSettings,
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
  multiProductSettings?: MultiProductPreviewSettings;
  onPreviewAction?: (
    action: "add" | "choose",
    itemId: string,
    slotIndex?: number,
  ) => void;
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
  multiProductSettings,
  onPreviewAction,
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
    showSubscriptionPreview,
    subscriptionPreviewStyle,
    subscriptionTitle,
    subscriptionSubtitle,
    showSubscriptionExplanation,
    subscriptionExplanationTitle,
    subscriptionExplanationBody,
    multiProductSettings,
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
    <div
      className="ciwi-bundle-preview-wrap"
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        if (!target || !onPreviewAction) return;
        const actionEl = target.closest("[data-preview-action]") as HTMLElement | null;
        if (!actionEl) return;
        const action = actionEl.getAttribute("data-preview-action");
        const itemId = actionEl.getAttribute("data-preview-item-id");
        const slotIndexRaw = actionEl.getAttribute("data-preview-slot-index");
        const slotIndex =
          slotIndexRaw != null && Number.isFinite(Number(slotIndexRaw))
            ? Number(slotIndexRaw)
            : undefined;
        if (!itemId) return;
        if (action === "add" || action === "choose") {
          onPreviewAction(action, itemId, slotIndex);
        }
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {prog ? <div dangerouslySetInnerHTML={{ __html: prog }} /> : null}
    </div>
  );
}
