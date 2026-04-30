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
  itemGroupTitle?: string;
  extraSections?: Array<{
    id: string;
    title: string;
    description?: string;
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
  meta?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

type CustomizationGroupProps = {
  title: string;
  meta: string;
  children: React.ReactNode;
};

type GroupSection = {
  id: string;
  title: string;
  meta?: string;
  content: React.ReactNode;
};

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-[14px] font-medium text-[#1c1f23]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldLabel label={label}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full cursor-pointer rounded-md border border-gray-300 p-1"
      />
    </FieldLabel>
  );
}

function CustomizationGroup({
  title,
  meta,
  children,
}: CustomizationGroupProps) {
  return (
    <section className="rounded-[12px] border border-[#dfe3e8] bg-[#fcfcfd] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[15px] font-semibold text-[#1c1f23]">{title}</div>
        <div className="text-[12px] text-[#5c6166]">{meta}</div>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function SectionCard({
  title,
  meta,
  open,
  onToggle,
  children,
}: SectionCardProps) {
  return (
    <div className="rounded-[12px] border border-[#e3e8ed] bg-white px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[14px] font-semibold text-[#1c1f23]">{title}</div>
            {meta ? (
              <span className="rounded-full bg-[#f4f6f8] px-2 py-[2px] text-[11px] font-medium text-[#5c6166]">
                {meta}
              </span>
            ) : null}
          </div>
        </div>
        <Button size="small" onClick={onToggle}>
          {open ? "Collapse" : "Edit"}
        </Button>
      </div>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export default function OfferComponentsDisplayCustomizer({
  itemGroupTitle = "Components",
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
    "layout",
    "widget-copy",
    "component-copy",
  ]);

  const toggleSection = (id: string) => {
    setOpenSectionIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  };

  const styleSections: GroupSection[] = [
    {
      id: "layout",
      title: "Layout",
      meta: "Shared",
      content: (
        <FieldLabel label="Layout Format">
          <Select
            size="large"
            value={layoutFormat}
            onChange={setLayoutFormat}
            className="w-full"
            options={[
              { label: "Vertical Stack", value: "vertical" },
              { label: "Horizontal Grid", value: "horizontal" },
              { label: "Card Grid", value: "card" },
              { label: "Compact List", value: "compact" },
            ]}
          />
        </FieldLabel>
      ),
    },
    {
      id: "offer-cards",
      title: "Offer Cards",
      meta: "Shared",
      content: (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ColorField
            label="Card Background Color"
            value={cardBackgroundColor}
            onChange={setCardBackgroundColor}
          />
          <ColorField
            label="Accent Color"
            value={accentColor}
            onChange={setAccentColor}
          />
          <ColorField
            label="Border Color"
            value={borderColor}
            onChange={setBorderColor}
          />
          <ColorField
            label="Label Text Color"
            value={labelColor}
            onChange={setLabelColor}
          />
          <FieldLabel label="Title Font Size (px)">
            <Input
              size="large"
              type="number"
              min={10}
              max={36}
              value={titleFontSize}
              onChange={(e) => setTitleFontSize(Number(e.target.value))}
            />
          </FieldLabel>
          <FieldLabel label="Title Font Weight">
            <Select
              size="large"
              value={titleFontWeight}
              onChange={setTitleFontWeight}
              className="w-full"
              options={[
                { label: "Regular (400)", value: "400" },
                { label: "Medium (500)", value: "500" },
                { label: "Semi Bold (600)", value: "600" },
                { label: "Bold (700)", value: "700" },
              ]}
            />
          </FieldLabel>
          <div className="lg:col-span-2">
            <ColorField
              label="Title Color"
              value={titleColor}
              onChange={setTitleColor}
            />
          </div>
        </div>
      ),
    },
    {
      id: "button-style",
      title: "Primary Button",
      meta: showCustomButton ? "Enabled" : "Optional",
      content: (
        <>
          <div className="mb-4 flex items-center justify-between rounded-[10px] bg-[#f6f8f9] px-4 py-3">
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
              <ColorField
                label="Button Color"
                value={buttonPrimaryColor}
                onChange={setButtonPrimaryColor}
              />
            </div>
          ) : null}
        </>
      ),
    },
  ];

  const contentSections: GroupSection[] = [
    {
      id: "widget-copy",
      title: "Widget Copy",
      meta: "Shared",
      content: (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FieldLabel label="Widget Title">
            <Input
              size="large"
              value={widgetTitle}
              placeholder="e.g. Bundle & Save"
              onChange={(e) =>
                setWidgetTitle(e.target.value.replace(/[\r\n]+/g, " "))
              }
              maxLength={OFFER_TEXT_LIMITS.widgetTitle}
              showCount
            />
          </FieldLabel>
          {showCustomButton ? (
            <FieldLabel label="Button Text">
              <Input
                size="large"
                value={buttonText}
                onChange={(e) =>
                  setButtonText(e.target.value.replace(/[\r\n]+/g, " "))
                }
                maxLength={OFFER_TEXT_LIMITS.buttonText}
                showCount
              />
            </FieldLabel>
          ) : null}
        </div>
      ),
    },
    ...extraSections.map((section) => ({
      id: section.id,
      title: section.title,
      meta: section.description,
      content: section.content,
    })),
    {
      id: "component-copy",
      title: itemGroupTitle,
      meta: `${items.length} items`,
      content: (
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const fields = item.fields || {
              title: true,
              subtitle: true,
              badge: true,
              isDefault: true,
            };

            return (
              <div
                key={item.id}
                className="rounded-[10px] border border-[#e8ebee] bg-[#ffffff] px-4 py-4"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <div className="text-[14px] font-semibold text-[#1c1f23]">
                    {item.displayTitle || item.title}
                  </div>
                  {item.isDefault ? (
                    <span className="rounded-full bg-[#f4f6f8] px-2 py-[2px] text-[11px] font-medium text-[#5c6166]">
                      Default
                    </span>
                  ) : null}
                </div>
                <div className="mb-4 text-[12px] text-[#5c6166]">
                  {item.description}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {fields.title !== false ? (
                    <FieldLabel label="Title">
                      <Input
                        size="large"
                        value={item.title}
                        placeholder={item.placeholders?.title || "Title"}
                        onChange={(e) =>
                          onUpdateItem(item.id, { title: e.target.value })
                        }
                      />
                    </FieldLabel>
                  ) : null}
                  {fields.badge ? (
                    <FieldLabel label="Badge">
                      <Input
                        size="large"
                        value={item.badge || ""}
                        placeholder={item.placeholders?.badge || "e.g. Most Popular"}
                        onChange={(e) =>
                          onUpdateItem(item.id, { badge: e.target.value })
                        }
                      />
                    </FieldLabel>
                  ) : null}
                  {fields.subtitle ? (
                    <div
                      className={
                        fields.title !== false && fields.badge ? "lg:col-span-2" : ""
                      }
                    >
                      <FieldLabel label="Subtitle">
                        <Input
                          size="large"
                          value={item.subtitle || ""}
                          placeholder={item.placeholders?.subtitle || "Subtitle"}
                          onChange={(e) =>
                            onUpdateItem(item.id, { subtitle: e.target.value })
                          }
                        />
                      </FieldLabel>
                    </div>
                  ) : null}
                </div>

                {fields.isDefault ? (
                  <div className="mt-4 rounded-[10px] bg-[#f6f8f9] px-4 py-3">
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
              </div>
            );
          })}
        </div>
      ),
    },
  ];

  return (
    <div className="mb-6 flex flex-col gap-4">
      <CustomizationGroup
        title="Style Customization"
        meta={`${styleSections.length} sections`}
      >
        {styleSections.map((section) => (
          <SectionCard
            key={section.id}
            title={section.title}
            meta={section.meta}
            open={openSectionIds.includes(section.id)}
            onToggle={() => toggleSection(section.id)}
          >
            {section.content}
          </SectionCard>
        ))}
      </CustomizationGroup>

      <CustomizationGroup
        title="Content Customization"
        meta={`${contentSections.length} sections`}
      >
        {contentSections.map((section) => (
          <SectionCard
            key={section.id}
            title={section.title}
            meta={section.meta}
            open={openSectionIds.includes(section.id)}
            onToggle={() => toggleSection(section.id)}
          >
            {section.content}
          </SectionCard>
        ))}
      </CustomizationGroup>
    </div>
  );
}
