import { renderBundlePreviewHtml } from "../../../../extensions/bundle-theme-product-custom/assets/bundle-preview-shared.js";

type Props = {
  layoutFormat: "vertical" | "horizontal" | "card" | "compact";
  accentColor: string;
  cardBackgroundColor: string;
  title?: string;
};

export default function BundlePreview({
  layoutFormat,
  accentColor,
  cardBackgroundColor,
  title = "Bundle & Save",
}: Props) {
  const html = renderBundlePreviewHtml({
    title,
    layoutFormat,
    accentColor,
    cardBackgroundColor,
  });

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
