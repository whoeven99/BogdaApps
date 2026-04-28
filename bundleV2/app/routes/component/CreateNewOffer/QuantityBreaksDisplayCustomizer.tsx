import { Button, Input, Select, Switch } from "antd";
import { useMemo, useState } from "react";
import { OFFER_TEXT_LIMITS } from "../../../utils/offerParsing";
import type { LayoutFormat } from "../BundlePreview/bundlePreviewShared";

type DiscountRule = {
  count: number;
  discountPercent: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

type Props = {
  discountRules: DiscountRule[];
  setDiscountRules: React.Dispatch<React.SetStateAction<DiscountRule[]>>;
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

export default function QuantityBreaksDisplayCustomizer({
  discountRules,
  setDiscountRules,
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

  const hasDefault = useMemo(
    () => discountRules.some((rule) => !!rule.isDefault),
    [discountRules],
  );

  const toggleSection = (id: string) => {
    setOpenSectionIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id],
    );
  };

  const updateRule = (index: number, patch: Partial<DiscountRule>) => {
    setDiscountRules((prev) =>
      prev.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    );
  };

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div>
        <h3 className="mb-1 text-[14px] font-medium text-[#1c1f23]">
          Offer Components
        </h3>
        <p className="m-0 text-[13px] text-[#5c6166]">
          Customize each visible component from here. Open a component to edit its
          copy or shared style settings.
        </p>
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
        description="Shared card colors and title typography for the quantity break options."
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
          <Switch
            checked={showCustomButton}
            onChange={setShowCustomButton}
          />
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

      <div className="flex flex-col gap-3">
        <div className="text-[14px] font-medium text-[#1c1f23]">Tier Components</div>
        {discountRules.map((rule, index) => {
          const sectionId = `tier-${index}`;
          const open = openSectionIds.includes(sectionId);
          const isFeatured = hasDefault ? !!rule.isDefault : index === 0;

          return (
            <SectionCard
              key={sectionId}
              title={rule.title || `Tier ${index + 1}`}
              description={`${rule.count} items • ${rule.discountPercent}% off${isFeatured ? " • featured in preview" : ""}`}
              open={open}
              onToggle={() => toggleSection(sectionId)}
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Title
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.title || ""}
                    placeholder={`e.g. ${rule.count} items`}
                    onChange={(e) => updateRule(index, { title: e.target.value })}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Badge
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.badge || ""}
                    placeholder="e.g. Most Popular"
                    onChange={(e) => updateRule(index, { badge: e.target.value })}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23] lg:col-span-2">
                  Subtitle
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.subtitle || ""}
                    placeholder={`e.g. You save ${rule.discountPercent}%`}
                    onChange={(e) => updateRule(index, { subtitle: e.target.value })}
                  />
                </label>
              </div>

              <div className="mt-4 rounded-[10px] border border-[#e5e7eb] bg-[#fafbfb] px-4 py-3">
                <Switch
                  checked={!!rule.isDefault}
                  onChange={(checked) =>
                    setDiscountRules((prev) =>
                      prev.map((currentRule, currentIndex) => ({
                        ...currentRule,
                        isDefault: checked ? currentIndex === index : false,
                      })),
                    )
                  }
                />
                <span className="ml-3 text-[13px] text-[#1c1f23]">
                  Set this tier as default selected
                </span>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
