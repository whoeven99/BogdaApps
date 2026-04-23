import type { ProgressiveGiftsConfig } from "../../../utils/offerParsing";
import {
  renderBundlePreviewHtml,
  renderProgressiveGiftsPreviewHtml,
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
  /** 阶梯赠品配置（可选） */
  progressiveGifts?: ProgressiveGiftsConfig | null;
  /** 预览用：模拟当前 Bar 序号（与 __ciwi_bundle_tier 一致） */
  progressivePreviewBarIndex?: number;
  /** 预览用：模拟购物车行数量（at_count 解锁） */
  progressivePreviewLineQty?: number;
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
