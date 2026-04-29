import { Button, Input, Select, Switch } from "antd";
import { useState } from "react";
import { OFFER_TEXT_LIMITS } from "../../../utils/offerParsing";
import type { LayoutFormat } from "../BundlePreview/bundlePreviewShared";

export type DisplayCustomizerItem = {
  id: string;
  title: string;
  displayTitle?: string;
  description: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
  fields?: {
    title?: boolean;
    subtitle?: boolean;
    badge?: boolean;
    isDefault?: boolean;
  };
  placeholders?: {
    title?: string;
    subtitle?: string;
    badge?: string;
  };
};

type Props = {
  heading?: string;
  intro?: string;
  itemGroupTitle?: string;
  itemGroupDescription?: string;
  extraSections?: Array<{
    id: string;
    title: string;
    description: string;
    content: React.ReactNode;
  }>;
  items: DisplayCustomizerItem[];
  onUpdateItem: (
    id: string,
    patch: Partial<{
      title: string;
      subtitle: string;
      badge: string;
      isDefault: boolean;
    }>,
  ) => void;
  widgetTitle: string;
  setWidgetTitle: (value: string) => void;
  layoutFormat: LayoutFormat;
  setLayoutFormat: (value: LayoutFormat) => void;
  cardBackgroundColor: string;
  setCardBackgroundColor: (value: string) => void;
  accentColor: string;
  setAccentColor: (value: string) => void;
  borderColor: string;
  setBorderColor: (value: string) => void;
  labelColor: string;
  setLabelColor: (value: string) => void;
  titleFontSize: number;
  setTitleFontSize: (value: number) => void;
  titleFontWeight: string;
  setTitleFontWeight: (value: string) => void;
  titleColor: string;
  setTitleColor: (value: string) => void;
  showCustomButton: boolean;
  setShowCustomButton: (checked: boolean) => void;
  buttonText: string;
  setButtonText: (value: string) => void;
  buttonPrimaryColor: string;
  setButtonPrimaryColor: (value: string) => void;
};

type SectionCardProps = {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function SectionCard({
  title,
  description,
  open,
  onToggle,
  children,
}: SectionCardProps) {
  return (
    <div className="rounded-[12px] border border-[#dfe3e8] bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-[#1c1f23]">{title}</div>
          <p className="m-0 mt-1 text-[13px] text-[#5c6166]">{description}</p>
        </div>
        <Button size="small" onClick={onToggle}>
          {open ? "Hide" : "Customize"}
        </Button>
      </div>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export default function OfferComponentsDisplayCustomizer({
  heading = "Offer Components",
  intro = "Customize each visible component from here. Open a component to edit its copy or shared style settings.",
  itemGroupTitle = "Offer Components",
  itemGroupDescription = "Open a component to edit its copy and presentation settings.",
  extraSections = [],
  items,
  onUpdateItem,
  widgetTitle,
  setWidgetTitle,
  layoutFormat,
  setLayoutFormat,
  cardBackgroundColor,
  setCardBackgroundColor,
  accentColor,
  setAccentColor,
  borderColor,
  setBorderColor,
  labelColor,
  setLabelColor,
  titleFontSize,
  setTitleFontSize,
  titleFontWeight,
  setTitleFontWeight,
  titleColor,
  setTitleColor,
  showCustomButton,
  setShowCustomButton,
  buttonText,
  setButtonText,
  buttonPrimaryColor,
  setButtonPrimaryColor,
}: Props) {
  const [openSectionIds, setOpenSectionIds] = useState<string[]>([
    "widget-header",
    "offer-cards",
  ]);

  const toggleSection = (id: string) => {
    setOpenSectionIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  };

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div>
        <h3 className="mb-1 text-[14px] font-medium text-[#1c1f23]">{heading}</h3>
        <p className="m-0 text-[13px] text-[#5c6166]">{intro}</p>
      </div>

      <SectionCard
        title="Widget Header"
        description="Control the bundle title and the overall layout format used by the component."
        open={openSectionIds.includes("widget-header")}
        onToggle={() => toggleSection("widget-header")}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="block text-[14px] font-medium text-[#1c1f23]">
            Widget Title
            <Input
              size="large"
              value={widgetTitle}
              placeholder="e.g. Bundle & Save"
              onChange={(e) =>
                setWidgetTitle(e.target.value.replace(/[\r\n]+/g, " "))
              }
              maxLength={OFFER_TEXT_LIMITS.widgetTitle}
              showCount
              className="mt-1"
            />
          </label>
          <label className="block text-[14px] font-medium text-[#1c1f23]">
            Layout Format
            <Select
              size="large"
              value={layoutFormat}
              onChange={setLayoutFormat}
              className="mt-1 w-full"
              options={[
                { label: "Vertical Stack", value: "vertical" },
                { label: "Horizontal Grid", value: "horizontal" },
                { label: "Card Grid", value: "card" },
                { label: "Compact List", value: "compact" },
              ]}
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Offer Cards"
        description="Shared card colors and title typography for the visible offer components."
        open={openSectionIds.includes("offer-cards")}
        onToggle={() => toggleSection("offer-cards")}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="block text-[14px] font-medium text-[#1c1f23]">
            Card Background Color
            <input
              type="color"
              value={cardBackgroundColor}
              onChange={(e) => setCardBackgroundColor(e.target.value)}
              className="mt-1 h-10 w-full cursor-pointer rounded-md border border-gray-300 p-1"
            />
          </label>
          <label className="block text-[14px] font-medium text-[#1c1f23]">
            Accent Color
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="mt-1 h-10 w-full cursor-pointer rounded-md border border-gray-300 p-1"
            />
          </label>
          <label className="block text-[14px] font-medium text-[#1c1f23]">
            Border Color
            <input
              type="color"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              className="mt-1 h-10 w-full cursor-pointer rounded-md border border-gray-300 p-1"
            />
          </label>
          <label className="block text-[14px] font-medium text-[#1c1f23]">
            Label Text Color
            <input
              type="color"
              value={labelColor}
              onChange={(e) => setLabelColor(e.target.value)}
              className="mt-1 h-10 w-full cursor-pointer rounded-md border border-gray-300 p-1"
            />
          </label>
          <label className="block text-[14px] font-medium text-[#1c1f23]">
            Title Font Size (px)
            <Input
              size="large"
              type="number"
              min={10}
              max={36}
              value={titleFontSize}
              onChange={(e) => setTitleFontSize(Number(e.target.value))}
              className="mt-1"
            />
          </label>
          <label className="block text-[14px] font-medium text-[#1c1f23]">
            Title Font Weight
            <Select
              size="large"
              value={titleFontWeight}
              onChange={setTitleFontWeight}
              className="mt-1 w-full"
              options={[
                { label: "Regular (400)", value: "400" },
                { label: "Medium (500)", value: "500" },
                { label: "Semi Bold (600)", value: "600" },
                { label: "Bold (700)", value: "700" },
              ]}
            />
          </label>
          <label className="block text-[14px] font-medium text-[#1c1f23] lg:col-span-2">
            Title Color
            <input
              type="color"
              value={titleColor}
              onChange={(e) => setTitleColor(e.target.value)}
              className="mt-1 h-10 w-full cursor-pointer rounded-md border border-gray-300 p-1"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Primary Button"
        description="Adjust the optional app button shown under the bundle component."
        open={openSectionIds.includes("primary-button")}
        onToggle={() => toggleSection("primary-button")}
      >
        <div className="mb-4 flex items-center justify-between rounded-[10px] border border-[#e5e7eb] bg-[#fafbfb] px-4 py-3">
          <div>
            <div className="text-[14px] font-medium text-[#1c1f23]">
              Show App&apos;s Add to Cart Button
            </div>
            <div className="text-[13px] text-[#5c6166]">
              If disabled, customers keep using your theme&apos;s native add to cart button.
            </div>
          </div>
          <Switch checked={showCustomButton} onChange={setShowCustomButton} />
        </div>

        {showCustomButton ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="block text-[14px] font-medium text-[#1c1f23]">
              Button Text
              <Input
                size="large"
                value={buttonText}
                onChange={(e) =>
                  setButtonText(e.target.value.replace(/[\r\n]+/g, " "))
                }
                className="mt-1"
                maxLength={OFFER_TEXT_LIMITS.buttonText}
                showCount
              />
            </label>
            <label className="block text-[14px] font-medium text-[#1c1f23]">
              Button Color
              <input
                type="color"
                value={buttonPrimaryColor}
                onChange={(e) => setButtonPrimaryColor(e.target.value)}
                className="mt-1 h-10 w-full cursor-pointer rounded-md border border-gray-300 p-1"
              />
            </label>
          </div>
        ) : null}
      </SectionCard>

      {extraSections.map((section) => (
        <SectionCard
          key={section.id}
          title={section.title}
          description={section.description}
          open={openSectionIds.includes(section.id)}
          onToggle={() => toggleSection(section.id)}
        >
          {section.content}
        </SectionCard>
      ))}

      <div className="flex flex-col gap-3">
        <div className="text-[14px] font-medium text-[#1c1f23]">{itemGroupTitle}</div>
        <div className="text-[13px] text-[#5c6166]">{itemGroupDescription}</div>
        {items.map((item) => {
          const sectionId = item.id;
          const open = openSectionIds.includes(sectionId);
          const fields = item.fields || {
            title: true,
            subtitle: true,
            badge: true,
            isDefault: true,
          };

          return (
            <SectionCard
              key={sectionId}
              title={item.displayTitle || item.title}
              description={item.description}
              open={open}
              onToggle={() => toggleSection(sectionId)}
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {fields.title !== false ? (
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Title
                    <Input
                      size="large"
                      className="mt-1"
                      value={item.title}
                      placeholder={item.placeholders?.title || "Title"}
                      onChange={(e) =>
                        onUpdateItem(item.id, { title: e.target.value })
                      }
                    />
                  </label>
                ) : null}
                {fields.badge ? (
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Badge
                    <Input
                      size="large"
                      className="mt-1"
                      value={item.badge || ""}
                      placeholder={item.placeholders?.badge || "e.g. Most Popular"}
                      onChange={(e) =>
                        onUpdateItem(item.id, { badge: e.target.value })
                      }
                    />
                  </label>
                ) : null}
                {fields.subtitle ? (
                  <label
                    className={`block text-[14px] font-medium text-[#1c1f23] ${
                      fields.title !== false && fields.badge ? "lg:col-span-2" : ""
                    }`}
                  >
                    Subtitle
                    <Input
                      size="large"
                      className="mt-1"
                      value={item.subtitle || ""}
                      placeholder={item.placeholders?.subtitle || "Subtitle"}
                      onChange={(e) =>
                        onUpdateItem(item.id, { subtitle: e.target.value })
                      }
                    />
                  </label>
                ) : null}
              </div>

              {fields.isDefault ? (
                <div className="mt-4 rounded-[10px] border border-[#e5e7eb] bg-[#fafbfb] px-4 py-3">
                  <Switch
                    checked={!!item.isDefault}
                    onChange={(checked) =>
                      onUpdateItem(item.id, { isDefault: checked })
                    }
                  />
                  <span className="ml-3 text-[13px] text-[#1c1f23]">
                    Set this component as default selected
                  </span>
                </div>
              ) : null}
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
