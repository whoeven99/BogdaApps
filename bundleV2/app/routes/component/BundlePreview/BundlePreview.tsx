import { renderBundlePreviewHtml, PreviewItem } from "./bundlePreviewShared";

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
  showSubscriptionPreview?: boolean;
  subscriptionPreviewStyle?: "solid" | "dashed";
  subscriptionTitle?: string;
  subscriptionSubtitle?: string;
  showSubscriptionExplanation?: boolean;
  subscriptionExplanationTitle?: string;
  subscriptionExplanationBody?: string;
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
  showSubscriptionPreview,
  subscriptionPreviewStyle,
  subscriptionTitle,
  subscriptionSubtitle,
  showSubscriptionExplanation,
  subscriptionExplanationTitle,
  subscriptionExplanationBody,
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
  });

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
