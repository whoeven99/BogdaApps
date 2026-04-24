import { renderBundlePreviewHtml, PreviewItem, MultiProductPreviewSettings } from "./bundlePreviewShared";

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
    multiProductSettings,
  });
  return (
    <div
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
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
