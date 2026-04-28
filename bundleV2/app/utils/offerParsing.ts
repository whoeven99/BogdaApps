export function normalizeOfferNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function sanitizeHexColor(raw: unknown, fallback: string): string {
  const t = String(raw ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9A-Fa-f]{8}$/.test(t)) return `#${t.slice(1, 7)}`.toLowerCase();
  return fallback;
}

export const OFFER_TEXT_LIMITS = {
  offerName: 80,
  cartTitle: 80,
  widgetTitle: 60,
  buttonText: 30,
} as const;

export function sanitizeSingleLineText(
  raw: unknown,
  maxLen: number,
  fallback = "",
): string {
  let out = "";
  for (const ch of String(raw ?? "")) {
    const code = ch.codePointAt(0) ?? 0;
    if ((code >= 0x200b && code <= 0x200d) || code === 0xfeff) continue;
    if (code <= 0x1f || code === 0x7f) {
      out += " ";
      continue;
    }
    out += ch;
  }
  const s = out.replace(/\s+/g, " ").trim();
  if (!s) return fallback;
  if (Number.isFinite(maxLen) && maxLen > 0) return s.slice(0, maxLen);
  return s;
}

export function clampNumber(
  raw: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  let n: number;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string") n = Number(raw);
  else n = Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function parseNonNegativeNumberOrNull(raw: unknown): number | null {
  let n: number;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string") n = Number(raw);
  else n = Number.NaN;
  if (!Number.isFinite(n)) return null;
  return n < 0 ? 0 : n;
}

export type OfferSettings = {
  title: string;
  layoutFormat: "vertical" | "horizontal" | "card" | "compact";
  totalBudget: number | null;
  dailyBudget: number | null;
  customerSegments: string | null;
  markets: string | null;
  usageLimitPerCustomer: string;
  accentColor: string;
  cardBackgroundColor: string;
  titleFontSize: number;
  titleFontWeight: string;
  titleColor: string;
  borderColor: string;
  labelColor: string;
  buttonText: string;
  buttonPrimaryColor: string;
  showCustomButton: boolean;
  scheduleTimezone?: string;
};

export function parseOfferSettings(offerSettingsJson?: string | null): OfferSettings {
  if (!offerSettingsJson) {
    return {
      title: "Bundle & Save",
      layoutFormat: "vertical",
      totalBudget: null,
      dailyBudget: null,
      customerSegments: null,
      markets: null,
      usageLimitPerCustomer: "unlimited",
      accentColor: "#008060",
      cardBackgroundColor: "#ffffff",
      titleFontSize: 14,
      titleFontWeight: "600",
      titleColor: "#111111",
      borderColor: "#dfe3e8",
      labelColor: "#ffffff",
      buttonText: "Add to Cart",
      buttonPrimaryColor: "#008060",
      showCustomButton: true,
      scheduleTimezone: undefined,
    };
  }

  try {
    const parsed = JSON.parse(offerSettingsJson) as Partial<OfferSettings>;
    const layout = parsed.layoutFormat;
    const layoutFormat: OfferSettings["layoutFormat"] = [
      "vertical",
      "horizontal",
      "card",
      "compact",
    ].includes(String(layout))
      ? (layout as OfferSettings["layoutFormat"])
      : "vertical";

    return {
      title: parsed.title || "Bundle & Save",
      layoutFormat,
      totalBudget:
        parsed.totalBudget !== undefined
          ? parseNonNegativeNumberOrNull(parsed.totalBudget)
          : null,
      dailyBudget:
        parsed.dailyBudget !== undefined
          ? parseNonNegativeNumberOrNull(parsed.dailyBudget)
          : null,
      customerSegments:
        parsed.customerSegments !== undefined ? parsed.customerSegments ?? null : null,
      markets: parsed.markets !== undefined ? parsed.markets ?? null : null,
      usageLimitPerCustomer: parsed.usageLimitPerCustomer ?? "unlimited",
      accentColor: sanitizeHexColor(parsed.accentColor, "#008060"),
      cardBackgroundColor: sanitizeHexColor(parsed.cardBackgroundColor, "#ffffff"),
      titleFontSize: clampNumber(parsed.titleFontSize, 10, 36, 14),
      titleFontWeight: ["400", "500", "600", "700"].includes(String(parsed.titleFontWeight))
        ? String(parsed.titleFontWeight)
        : "600",
      titleColor: sanitizeHexColor(parsed.titleColor, "#111111"),
      borderColor: sanitizeHexColor(parsed.borderColor, "#dfe3e8"),
      labelColor: sanitizeHexColor(parsed.labelColor, "#ffffff"),
      buttonText: parsed.buttonText || "Add to Cart",
      buttonPrimaryColor: sanitizeHexColor(parsed.buttonPrimaryColor, "#008060"),
      showCustomButton: parsed.showCustomButton !== false,
      scheduleTimezone: parsed.scheduleTimezone,
    };
  } catch {
    return parseOfferSettings(null);
  }
}

export type DiscountRule = {
  count: number;
  discountPercent: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

export type CampaignScope = {
  productIds: string[];
  markets: string[];
  customerSegments: string[];
};

export type QuantityBreakTier = {
  qty: number;
  discountPercent: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

export type QuantityBreaksLogicBlock = {
  id: string;
  type: "quantity-breaks";
  config: {
    tiers: QuantityBreakTier[];
  };
};

export type OfferCardDisplayBlock = {
  id: string;
  type: "offer-card";
  logicBlockRef: string;
  config: {
    title: string;
    layoutFormat: OfferSettings["layoutFormat"];
    accentColor: string;
    cardBackgroundColor: string;
    borderColor: string;
    labelColor: string;
    titleFontSize: number;
    titleFontWeight: string;
    titleColor: string;
    buttonText: string;
    buttonPrimaryColor: string;
    showCustomButton: boolean;
  };
};

export type CountdownDisplayBlock = {
  id: string;
  type: "countdown";
  config: {
    endTimeMode: "campaign-end-time";
    label: string;
  };
};

export type LogicBlock = QuantityBreaksLogicBlock;
export type DisplayBlock = OfferCardDisplayBlock | CountdownDisplayBlock;

export type CampaignSettings = {
  status: boolean;
  startTime: string;
  endTime: string;
  scheduleTimezone?: string;
  totalBudget: number | null;
  dailyBudget: number | null;
  usageLimitPerCustomer: string;
};

export type CampaignConfig = {
  version: 1;
  scope: CampaignScope;
  logicBlocks: LogicBlock[];
  displayBlocks: DisplayBlock[];
  settings: CampaignSettings;
};

export function parseDiscountRules(discountRulesJson?: string | null): DiscountRule[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: DiscountRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const count = Number((item as { count?: unknown }).count);
      const discountPercent = Number(
        (item as { discountPercent?: unknown }).discountPercent,
      );
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(discountPercent)) continue;
      out.push({
        count: Math.trunc(count),
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
        title: (item as { title?: string }).title || "",
        subtitle: (item as { subtitle?: string }).subtitle || "",
        badge: (item as { badge?: string }).badge || "",
        isDefault: !!(item as { isDefault?: boolean }).isDefault,
      });
    }
    out.sort((a, b) => a.count - b.count);
    return out;
  } catch {
    return [];
  }
}

function buildDefaultOfferCardConfig(
  settings: OfferSettings,
): OfferCardDisplayBlock["config"] {
  return {
    title: settings.title || "Bundle & Save",
    layoutFormat: settings.layoutFormat,
    accentColor: sanitizeHexColor(settings.accentColor, "#008060"),
    cardBackgroundColor: sanitizeHexColor(
      settings.cardBackgroundColor,
      "#ffffff",
    ),
    borderColor: sanitizeHexColor(settings.borderColor, "#dfe3e8"),
    labelColor: sanitizeHexColor(settings.labelColor, "#ffffff"),
    titleFontSize: clampNumber(settings.titleFontSize, 10, 36, 14),
    titleFontWeight: ["400", "500", "600", "700"].includes(
      String(settings.titleFontWeight),
    )
      ? String(settings.titleFontWeight)
      : "600",
    titleColor: sanitizeHexColor(settings.titleColor, "#111111"),
    buttonText: settings.buttonText || "Add to Cart",
    buttonPrimaryColor: sanitizeHexColor(
      settings.buttonPrimaryColor,
      "#008060",
    ),
    showCustomButton: settings.showCustomButton !== false,
  };
}

function sanitizeQuantityBreakTier(raw: unknown): QuantityBreakTier | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const qty = Math.trunc(Number(item.qty));
  const discountPercent = Number(item.discountPercent);
  if (!Number.isFinite(qty) || qty < 1) return null;
  if (!Number.isFinite(discountPercent)) return null;
  return {
    qty,
    discountPercent: Math.max(0, Math.min(100, discountPercent)),
    title: typeof item.title === "string" ? item.title : "",
    subtitle: typeof item.subtitle === "string" ? item.subtitle : "",
    badge: typeof item.badge === "string" ? item.badge : "",
    isDefault: !!item.isDefault,
  };
}

function sanitizeLogicBlock(raw: unknown): LogicBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (item.type !== "quantity-breaks") return null;
  const config = item.config;
  const configRecord =
    config && typeof config === "object" ? (config as Record<string, unknown>) : {};
  const tiersRaw = Array.isArray(configRecord.tiers) ? configRecord.tiers : [];
  const tiers = tiersRaw
    .map((tier) => sanitizeQuantityBreakTier(tier))
    .filter((tier): tier is QuantityBreakTier => tier !== null)
    .sort((a, b) => a.qty - b.qty)
    .filter((tier, index, arr) => index === arr.findIndex((it) => it.qty === tier.qty));

  if (tiers.length === 0) return null;

  return {
    id: typeof item.id === "string" && item.id ? item.id : "logic-quantity-breaks",
    type: "quantity-breaks",
    config: { tiers },
  };
}

function sanitizeDisplayBlock(raw: unknown): DisplayBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" && item.id ? item.id : "display-block";

  if (item.type === "offer-card") {
    const config =
      item.config && typeof item.config === "object"
        ? (item.config as Record<string, unknown>)
        : {};
    const layoutCandidate = String(config.layoutFormat || "vertical");
    const layoutFormat: OfferSettings["layoutFormat"] = [
      "vertical",
      "horizontal",
      "card",
      "compact",
    ].includes(layoutCandidate)
      ? (layoutCandidate as OfferSettings["layoutFormat"])
      : "vertical";
    return {
      id,
      type: "offer-card",
      logicBlockRef:
        typeof item.logicBlockRef === "string" && item.logicBlockRef
          ? item.logicBlockRef
          : "logic-quantity-breaks",
      config: {
        title: typeof config.title === "string" && config.title
          ? config.title
          : "Bundle & Save",
        layoutFormat,
        accentColor: sanitizeHexColor(config.accentColor, "#008060"),
        cardBackgroundColor: sanitizeHexColor(
          config.cardBackgroundColor,
          "#ffffff",
        ),
        borderColor: sanitizeHexColor(config.borderColor, "#dfe3e8"),
        labelColor: sanitizeHexColor(config.labelColor, "#ffffff"),
        titleFontSize: clampNumber(config.titleFontSize, 10, 36, 14),
        titleFontWeight: ["400", "500", "600", "700"].includes(
          String(config.titleFontWeight),
        )
          ? String(config.titleFontWeight)
          : "600",
        titleColor: sanitizeHexColor(config.titleColor, "#111111"),
        buttonText:
          typeof config.buttonText === "string" && config.buttonText
            ? config.buttonText
            : "Add to Cart",
        buttonPrimaryColor: sanitizeHexColor(
          config.buttonPrimaryColor,
          "#008060",
        ),
        showCustomButton: config.showCustomButton !== false,
      },
    };
  }

  if (item.type === "countdown") {
    const config =
      item.config && typeof item.config === "object"
        ? (item.config as Record<string, unknown>)
        : {};
    return {
      id,
      type: "countdown",
      config: {
        endTimeMode: "campaign-end-time",
        label:
          typeof config.label === "string" && config.label
            ? config.label
            : "Limited time offer",
      },
    };
  }

  return null;
}

export function parseCampaignConfig(
  campaignConfigJson?: string | null,
): CampaignConfig | null {
  if (!campaignConfigJson) return null;

  try {
    const parsed = JSON.parse(campaignConfigJson) as Record<string, unknown>;
    const scopeRaw =
      parsed.scope && typeof parsed.scope === "object"
        ? (parsed.scope as Record<string, unknown>)
        : {};
    const settingsRaw =
      parsed.settings && typeof parsed.settings === "object"
        ? (parsed.settings as Record<string, unknown>)
        : {};
    const logicBlocksRaw = Array.isArray(parsed.logicBlocks)
      ? parsed.logicBlocks
      : [];
    const displayBlocksRaw = Array.isArray(parsed.displayBlocks)
      ? parsed.displayBlocks
      : [];

    const logicBlocks = logicBlocksRaw
      .map((block) => sanitizeLogicBlock(block))
      .filter((block): block is LogicBlock => block !== null);
    if (logicBlocks.length === 0) return null;

    const logicIds = new Set(logicBlocks.map((block) => block.id));
    const displayBlocks = displayBlocksRaw
      .map((block) => sanitizeDisplayBlock(block))
      .filter((block): block is DisplayBlock => block !== null)
      .filter((block) =>
        block.type === "offer-card" ? logicIds.has(block.logicBlockRef) : true,
      );

    return {
      version: 1,
      scope: {
        productIds: Array.isArray(scopeRaw.productIds)
          ? scopeRaw.productIds
              .map((id) => String(id || "").trim())
              .filter(Boolean)
          : [],
        markets: Array.isArray(scopeRaw.markets)
          ? scopeRaw.markets
              .map((market) => String(market || "").trim())
              .filter(Boolean)
          : ["all"],
        customerSegments: Array.isArray(scopeRaw.customerSegments)
          ? scopeRaw.customerSegments
              .map((segment) => String(segment || "").trim())
              .filter(Boolean)
          : ["all"],
      },
      logicBlocks,
      displayBlocks,
      settings: {
        status: settingsRaw.status !== false,
        startTime:
          typeof settingsRaw.startTime === "string" ? settingsRaw.startTime : "",
        endTime: typeof settingsRaw.endTime === "string" ? settingsRaw.endTime : "",
        scheduleTimezone:
          typeof settingsRaw.scheduleTimezone === "string"
            ? settingsRaw.scheduleTimezone
            : undefined,
        totalBudget:
          settingsRaw.totalBudget !== undefined
            ? parseNonNegativeNumberOrNull(settingsRaw.totalBudget)
            : null,
        dailyBudget:
          settingsRaw.dailyBudget !== undefined
            ? parseNonNegativeNumberOrNull(settingsRaw.dailyBudget)
            : null,
        usageLimitPerCustomer:
          typeof settingsRaw.usageLimitPerCustomer === "string" &&
          settingsRaw.usageLimitPerCustomer
            ? settingsRaw.usageLimitPerCustomer
            : "unlimited",
      },
    };
  } catch {
    return null;
  }
}

export function migrateLegacyOfferToCampaignConfig(params: {
  selectedProductsJson?: string | null;
  discountRulesJson?: string | null;
  offerSettingsJson?: string | null;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  status?: boolean;
}): CampaignConfig {
  const offerSettings = parseOfferSettings(params.offerSettingsJson);
  const tiers = parseDiscountRules(params.discountRulesJson).map((rule) => ({
    qty: rule.count,
    discountPercent: rule.discountPercent,
    title: rule.title || "",
    subtitle: rule.subtitle || "",
    badge: rule.badge || "",
    isDefault: !!rule.isDefault,
  }));
  const productIds = parseSelectedProductIds(params.selectedProductsJson);
  const logicBlockId = "logic-quantity-breaks";
  const settings = {
    status: params.status !== false,
    startTime:
      params.startTime instanceof Date
        ? params.startTime.toISOString()
        : String(params.startTime || ""),
    endTime:
      params.endTime instanceof Date
        ? params.endTime.toISOString()
        : String(params.endTime || ""),
    scheduleTimezone: offerSettings.scheduleTimezone,
    totalBudget: offerSettings.totalBudget,
    dailyBudget: offerSettings.dailyBudget,
    usageLimitPerCustomer: offerSettings.usageLimitPerCustomer,
  };

  return {
    version: 1,
    scope: {
      productIds,
      markets: offerSettings.markets ? offerSettings.markets.split(",") : ["all"],
      customerSegments: offerSettings.customerSegments
        ? offerSettings.customerSegments.split(",")
        : ["all"],
    },
    logicBlocks: [
      {
        id: logicBlockId,
        type: "quantity-breaks",
        config: {
          tiers:
            tiers.length > 0
              ? tiers
              : [
                  {
                    qty: 2,
                    discountPercent: 10,
                    title: "",
                    subtitle: "",
                    badge: "",
                    isDefault: true,
                  },
                ],
        },
      },
    ],
    displayBlocks: [
      {
        id: "display-offer-card",
        type: "offer-card",
        logicBlockRef: logicBlockId,
        config: buildDefaultOfferCardConfig(offerSettings),
      },
    ],
    settings,
  };
}

export function buildLegacyFieldsFromCampaignConfig(config: CampaignConfig): {
  offerType: string;
  selectedProductsJson: string | null;
  discountRulesJson: string | null;
  offerSettingsJson: string;
} {
  const quantityBreaks = config.logicBlocks.find(
    (block): block is QuantityBreaksLogicBlock => block.type === "quantity-breaks",
  );
  const offerCard = config.displayBlocks.find(
    (block): block is OfferCardDisplayBlock => block.type === "offer-card",
  );

  const discountRules = (quantityBreaks?.config.tiers ?? []).map((tier) => ({
    count: tier.qty,
    discountPercent: tier.discountPercent,
    title: tier.title || "",
    subtitle: tier.subtitle || "",
    badge: tier.badge || "",
    isDefault: !!tier.isDefault,
  }));

  const offerSettings = {
    title: offerCard?.config.title || "Bundle & Save",
    layoutFormat: offerCard?.config.layoutFormat || "vertical",
    totalBudget: config.settings.totalBudget,
    dailyBudget: config.settings.dailyBudget,
    customerSegments: config.scope.customerSegments.length
      ? config.scope.customerSegments.join(",")
      : null,
    markets: config.scope.markets.length ? config.scope.markets.join(",") : null,
    usageLimitPerCustomer: config.settings.usageLimitPerCustomer || "unlimited",
    accentColor: offerCard?.config.accentColor || "#008060",
    cardBackgroundColor: offerCard?.config.cardBackgroundColor || "#ffffff",
    borderColor: offerCard?.config.borderColor || "#dfe3e8",
    labelColor: offerCard?.config.labelColor || "#ffffff",
    titleColor: offerCard?.config.titleColor || "#111111",
    buttonPrimaryColor: offerCard?.config.buttonPrimaryColor || "#008060",
    titleFontSize: offerCard?.config.titleFontSize ?? 14,
    titleFontWeight: offerCard?.config.titleFontWeight || "600",
    buttonText: offerCard?.config.buttonText || "Add to Cart",
    showCustomButton: offerCard?.config.showCustomButton !== false,
    scheduleTimezone: config.settings.scheduleTimezone,
  } satisfies OfferSettings;

  return {
    offerType: quantityBreaks ? "quantity-breaks-same" : "campaign-builder",
    selectedProductsJson:
      config.scope.productIds.length > 0
        ? JSON.stringify(config.scope.productIds.map((id) => ({ id })))
        : null,
    discountRulesJson:
      discountRules.length > 0 ? JSON.stringify(discountRules) : null,
    offerSettingsJson: JSON.stringify(offerSettings),
  };
}

export function getOfferDisplayType(
  offerType: string,
  campaignConfigJson?: string | null,
): string {
  const config = parseCampaignConfig(campaignConfigJson);
  const primaryBlock = config?.logicBlocks[0];
  if (primaryBlock?.type === "quantity-breaks") return "Quantity breaks";
  if (offerType === "quantity-breaks-same") return "Quantity breaks";
  return offerType || "Campaign";
}

export function getOfferRulesText(params: {
  campaignConfigJson?: string | null;
  discountRulesJson?: string | null;
}): string {
  const config = parseCampaignConfig(params.campaignConfigJson);
  if (config) {
    const quantityBreaks = config.logicBlocks.find(
      (block): block is QuantityBreaksLogicBlock => block.type === "quantity-breaks",
    );
    const tiers = quantityBreaks?.config.tiers ?? [];
    if (tiers.length > 0) {
      return tiers
        .map((tier) => `Buy ${tier.qty} Get ${tier.discountPercent}% Off`)
        .join(", ");
    }
  }

  const rules = parseDiscountRules(params.discountRulesJson);
  if (rules.length > 0) {
    return rules.map((rule) => `Buy ${rule.count} Get ${rule.discountPercent}% Off`).join(", ");
  }

  return "-";
}

export function getOfferScheduleTimezone(params: {
  campaignConfigJson?: string | null;
  offerSettingsJson?: string | null;
  fallback?: string;
}): string {
  const config = parseCampaignConfig(params.campaignConfigJson);
  if (config?.settings.scheduleTimezone) {
    return config.settings.scheduleTimezone;
  }
  const offerSettings = parseOfferSettings(params.offerSettingsJson);
  return offerSettings.scheduleTimezone || params.fallback || "UTC";
}

export function parseSelectedProductIds(selectedProductsJson?: string | null): string[] {
  if (!selectedProductsJson) return [];

  try {
    const parsed = JSON.parse(selectedProductsJson);
    if (!Array.isArray(parsed)) return [];

    const ids: string[] = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        ids.push(item);
        continue;
      }

      if (item && typeof item === "object") {
        const id = (item as { id?: unknown }).id;
        if (typeof id === "string") ids.push(id);
        else if (typeof id === "number") ids.push(String(id));
      }
    }

    return ids;
  } catch {
    return [];
  }
}
