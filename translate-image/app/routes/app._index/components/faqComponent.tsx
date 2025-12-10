import { Collapse, CollapseProps, Typography } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useReport from "scripts/eventReport";
const { Title, Text } = Typography;
export const FaqComponent = () => {
  // const +
  const { reportClick, report } = useReport();
  const { t } = useTranslation();
  const collapseData: CollapseProps["items"] = useMemo(
    () => [
      {
        key: 0,
        label: t("What types of images can the tool translate?"),
        children: t(
          "It supports product images, theme banners, blog post images, page images, and images in custom blocks.",
        ),
      },
      {
        key: 1,
        label: t("Which languages are supported?"),
        children: t(
          "We support translation across 50+ major global languages, including Chinese, English, Japanese, Korean, German, Spanish, French, Italian, Arabic, and more.",
        ),
      },
      {
        key: 2,
        label: t("How does the tool recognize and translate text in images?"),
        children: t(
          "We use OCR combined with a multimodal AI model to detect text within images and translate it while keeping the original font, layout, and tone consistent.",
        ),
      },
      {
        key: 3,
        label: t("Will translated images replace the original ones?"),
        children: t(
          "No. All translated images are saved as independent copies and can be loaded automatically based on language.",
        ),
      },
      {
        key: 4,
        label: t(
          "Can images switch automatically based on the visitor's language?",
        ),
        children: t(
          "Yes. Once our plugin is enabled, images can automatically switch based on language and market.",
        ),
      },
      {
        key: 5,
        label: t("Will translated images slow down my website?"),
        children: t(
          "No. Images are optimized and delivered through a global CDN, ensuring minimal impact on page load speed.",
        ),
      },
      {
        key: 6,
        label: t(
          "Can the tool translate size charts, ingredient tables, and other text-heavy graphics?",
        ),
        children: t(
          "Yes. OCR can recognize most embedded text while preserving layout consistency.",
        ),
      },
      {
        key: 7,
        label: t("Which image formats are supported?"),
        children: t("We currently support JPG and PNG formats."),
      },
      {
        key: 8,
        label: t("Does the tool support batch translation?"),
        children: t(
          "Yes. It supports batch product translation, theme-wide scanning, and automatic syncing of new images.",
        ),
      },
      {
        key: 9,
        label: t("Can the translation maintain my brand's tone and style?"),
        children: t(
          "Not yet. Custom brand tone, writing style, and terminology settings are currently not supported.",
        ),
      },
      {
        key: 10,
        label: t("Are there any copyright issues with translated images?"),
        children: t(
          "No. Translated images are generated from your original images, and all rights remain with you.",
        ),
      },
      {
        key: 11,
        label: t(
          "How accurate is the translation? Do I still need manual review?",
        ),
        children: t(
          "Translation quality is high for most use cases, but we recommend a quick manual check for key banners.",
        ),
      },
      {
        key: 12,
        label: t("Does the tool work with custom themes?"),
        children: t("Yes. It supports all Shopify themes."),
      },
      {
        key: 13,
        label: t("Is the tool compatible with Shopify's multilingual system?"),
        children: t(
          "Yes. It is fully compatible with Shopify Markets and uses a safe and compliant image-switching mechanism.",
        ),
      },
      {
        key: 14,
        label: t("What pricing models are available?"),
        children: t("We support subscription-based and usage-based pricing."),
      },
      {
        key: 15,
        label: t("Where are translated images stored?"),
        children: t(
          "Theme images are stored in Shopify Files whenever possible. For areas where Shopify Files are not supported, images are stored on a secure CDN.",
        ),
      },
      {
        key: 16,
        label: t("Can I revert or redo translations?"),
        children: t(
          "Reverting to the original image is not yet supported, but you can re-translate images anytime.",
        ),
      },
      {
        key: 17,
        label: t("What new features are planned?"),
        children: t(
          "Upcoming features include video subtitle translation, automatic detection of untranslated images, and AI-based image enhancement.",
        ),
      },
      {
        key: 18,
        label: t("What is included in the free trial?"),
        children: t(
          "All features are available during the trial, powered by the latest AI translation models. We also provide 40 free translation credits.",
        ),
      },
      {
        key: 19,
        label: t("Can I manually replace images instead of translating them?"),
        children: t(
          "Yes. You can manually replace images with your own versions at no cost.",
        ),
      },
      {
        key: 20,
        label: t("Does image translation help with SEO?"),
        children: t(
          "Yes. Translated images improve SEO, and we also translate alt text to further enhance search visibility.",
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <Title level={4}>{t("FAQ")}</Title>
      <Collapse
        items={collapseData}
        onChange={() => {
          reportClick("dashboard_faq_button");
        }}
      />
    </div>
  );
};
