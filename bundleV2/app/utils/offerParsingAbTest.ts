/**
 * A/B 测试相关的解析与权重计算（与 zz/feature/20260427/abTest 分支保持一致）。
 * 独立文件，避免与本项目「统一规则」用的宽 DiscountRule 类型冲突。
 */

function sanitizeSingleLineText(raw: unknown, maxLen: number, fallback = ""): string {
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

function clampNumber(raw: unknown, min: number, max: number, fallback: number): number {
  let n: number;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string") n = Number(raw);
  else n = Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function fnv1a32Base36(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function normalizeAbVariantId(rawId: string, salt: string, index: number, key: string): string {
  const rid = sanitizeSingleLineText(rawId, 120, "");
  // 已持久化的 abv_* 必须保持幂等（避免二次解析时再次 hash，导致 id 漂移，进而统计/映射失败）。
  // 允许历史内置默认值（abv_default_*）与哈希值（abv_[0-9a-z]+）。
  if (/^abv_[0-9a-z_]+$/i.test(rid)) {
    return rid;
  }
  const k = sanitizeSingleLineText(key, 16, "");
  const seed = `${salt}::${rid || `idx:${index}`}::${k || "nokey"}::v1`;
  // 强制使用 abv_*；保持稳定且避免与历史 legacy id 冲突
  return `abv_${fnv1a32Base36(seed)}`;
}

/** 与 quantity-breaks-same / A/B 变体阶梯 JSON 一致（含可选定价模式，兼容仅 discountPercent 的旧数据） */
export type AbTestQuantityDiscountRule = {
  count: number;
  discountPercent: number;
  priceMode?: "full_price" | "percentage_off" | "amount_off" | "fixed_price";
  discountValue?: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

/** A/B 变体：每路独立阶梯折扣（与 quantity bundle 的 discountRules 结构一致） */
export type AbTestVariantStored = {
  id: string;
  key: string;
  discountRules: AbTestQuantityDiscountRule[];
};

/** 落库/主题侧读取的 A/B 配置（含归一化后的流量权重，长度与 variants 一致） */
export type AbTestOfferSettingsStored = {
  salt: string;
  allocationMode: "even" | "custom";
  /** 各 variant 流量占比（整数，总和 100） */
  trafficWeights: number[];
  variants: AbTestVariantStored[];
  /** 旧版双桶字段，仅用于兼容读取 */
  groupADiscountPercent?: number;
  groupBDiscountPercent?: number;
  bucketSplitPercent?: number;
};

const QUANTITY_BREAK_PRICE_MODES = [
  "full_price",
  "percentage_off",
  "amount_off",
  "fixed_price",
] as const;

function parseAbTestQuantityDiscountRules(json?: string | null): AbTestQuantityDiscountRule[] {
  if (!json) return [];

  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: AbTestQuantityDiscountRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const count = Number((item as { count?: unknown }).count);
      const discountPercentRaw = Number((item as { discountPercent?: unknown }).discountPercent);
      if (!Number.isFinite(count) || count < 1) continue;
      const discountPercent = Number.isFinite(discountPercentRaw)
        ? Math.max(0, Math.min(100, discountPercentRaw))
        : 0;
      const rawMode = String((item as { priceMode?: unknown }).priceMode || "");
      const priceMode: NonNullable<AbTestQuantityDiscountRule["priceMode"]> =
        QUANTITY_BREAK_PRICE_MODES.includes(rawMode as (typeof QUANTITY_BREAK_PRICE_MODES)[number])
          ? (rawMode as NonNullable<AbTestQuantityDiscountRule["priceMode"]>)
          : "percentage_off";
      const dvRaw = Number((item as { discountValue?: unknown }).discountValue);
      const discountValue = Number.isFinite(dvRaw)
        ? Math.max(0, dvRaw)
        : priceMode === "percentage_off"
          ? discountPercent
          : discountPercent;
      const syncedPercent =
        priceMode === "percentage_off"
          ? Math.max(0, Math.min(100, discountValue))
          : priceMode === "full_price"
            ? 0
            : discountPercent;
      out.push({
        count: Math.trunc(count),
        discountPercent: syncedPercent,
        priceMode,
        discountValue: priceMode === "full_price" ? 0 : Math.max(0, discountValue),
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

const DEFAULT_AB_DISCOUNT_RULES: AbTestQuantityDiscountRule[] = [
  {
    count: 2,
    discountPercent: 15,
    priceMode: "percentage_off",
    discountValue: 15,
    title: "",
    subtitle: "",
    badge: "",
    isDefault: true,
  },
];

/** 将 N 路流量均分（整数权重，总和 100） */
export function computeEvenTrafficWeights(variantCount: number): number[] {
  const n = Math.max(2, Math.min(24, Math.trunc(variantCount) || 2));
  const base = Math.floor(100 / n);
  const weights = Array.from({ length: n }, () => base);
  let rem = 100 - base * n;
  for (let i = 0; i < n && rem > 0; i += 1, rem -= 1) {
    weights[i] += 1;
  }
  return weights;
}

/** 将自定义权重归一为整数且总和 100；非法时退回均分 */
export function normalizeTrafficWeights(
  mode: "even" | "custom",
  raw: number[] | undefined,
  variantCount: number,
): number[] {
  const n = Math.max(2, Math.min(24, Math.trunc(variantCount) || 2));
  if (mode !== "custom" || !raw || raw.length !== n) {
    return computeEvenTrafficWeights(n);
  }
  const floored = raw.map((x) => {
    const v = Number(x);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.floor(v));
  });
  const sum = floored.reduce((a, b) => a + b, 0);
  if (sum <= 0) return computeEvenTrafficWeights(n);
  const scaled = floored.map((w) => Math.max(0, Math.round((w * 100) / sum)));
  const s2 = scaled.reduce((a, b) => a + b, 0);
  let diff = 100 - s2;
  const out = [...scaled];
  let idx = 0;
  while (diff !== 0 && out.length > 0) {
    const step = diff > 0 ? 1 : -1;
    const j = idx % out.length;
    if (step < 0 && out[j] <= 0) {
      idx += 1;
      if (idx > out.length * 100) break;
      continue;
    }
    if (step > 0 && out[j] === 0 && out.some((w) => w > 0)) {
      idx += 1;
      if (idx > out.length * 100) break;
      continue;
    }
    out[j] += step;
    diff -= step;
    idx += 1;
  }
  if (out.reduce((a, b) => a + b, 0) !== 100) return computeEvenTrafficWeights(n);
  return out;
}

function cloneDefaultAbRules(): AbTestQuantityDiscountRule[] {
  return DEFAULT_AB_DISCOUNT_RULES.map((r) => ({ ...r }));
}

function buildDefaultAbTestStored(salt: string): AbTestOfferSettingsStored {
  const variants: AbTestVariantStored[] = [
    { id: "abv_default_a", key: "A", discountRules: cloneDefaultAbRules() },
    {
      id: "abv_default_b",
      key: "B",
      discountRules: cloneDefaultAbRules().map((r, i) =>
        i === 0 ? { ...r, isDefault: false } : r,
      ),
    },
  ];
  return {
    salt,
    allocationMode: "even",
    trafficWeights: computeEvenTrafficWeights(variants.length),
    variants,
  };
}

/** 从原始 JSON 解析 A/B 块：支持多 variant；兼容旧版 groupA/B + bucketSplit */
export function parseAbTestOfferSettingsBlock(
  abRaw: unknown,
  saltHint: string,
): AbTestOfferSettingsStored {
  const salt = sanitizeSingleLineText(saltHint, 120, "");
  const ab =
    abRaw && typeof abRaw === "object" && !Array.isArray(abRaw)
      ? (abRaw as Record<string, unknown>)
      : {};

  const variantsIn = Array.isArray(ab.variants) ? ab.variants : null;
  if (variantsIn && variantsIn.length >= 2) {
    const variants: AbTestVariantStored[] = [];
    const usedIds = new Set<string>();
    const usedKeys = new Set<string>();
    for (let sourceIndex = 0; sourceIndex < variantsIn.length; sourceIndex += 1) {
      if (variants.length >= 4) break;
      const row = variantsIn[sourceIndex];
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const fallbackKeyBase =
        sourceIndex >= 0 && sourceIndex < 26
          ? String.fromCharCode(65 + sourceIndex)
          : `V${sourceIndex + 1}`;
      const idRaw = sanitizeSingleLineText(o.id, 120, "");
      let key = sanitizeSingleLineText(o.key, 8, fallbackKeyBase);
      let id = normalizeAbVariantId(idRaw, salt, sourceIndex, key);
      let rules: AbTestQuantityDiscountRule[] = [];
      if (Array.isArray(o.discountRules)) {
        rules = parseAbTestQuantityDiscountRules(JSON.stringify(o.discountRules));
      } else if (typeof o.discountRules === "string") {
        rules = parseAbTestQuantityDiscountRules(o.discountRules);
      }
      if (!rules.length) {
        rules = cloneDefaultAbRules().map((r, i) =>
          i === 0 ? { ...r, isDefault: variants.length === 0 } : r,
        );
      }
      if (!id || !key) continue;
      if (usedIds.has(id)) {
        id = `${id}_${sourceIndex + 1}`;
      }
      if (usedKeys.has(key)) {
        key = `${key}${sourceIndex + 1}`;
      }
      usedIds.add(id);
      usedKeys.add(key);
      variants.push({ id, key, discountRules: rules });
    }
    if (variants.length < 2) {
      return buildDefaultAbTestStored(salt);
    }
    const mode = ab.allocationMode === "custom" ? "custom" : "even";
    let rawW = Array.isArray(ab.customWeights)
      ? (ab.customWeights as unknown[]).map((x) => Number(x))
      : Array.isArray(ab.trafficWeights)
        ? (ab.trafficWeights as unknown[]).map((x) => Number(x))
        : undefined;
    if (Array.isArray(rawW) && rawW.length > variants.length) {
      rawW = rawW.slice(0, variants.length);
    }
    const trafficWeights = normalizeTrafficWeights(mode, rawW, variants.length);
    return {
      salt,
      allocationMode: mode,
      trafficWeights,
      variants,
    };
  }

  const ga = clampNumber(ab.groupADiscountPercent, 0, 100, 10);
  const gb = clampNumber(ab.groupBDiscountPercent, 0, 100, 90);
  const sp = clampNumber(ab.bucketSplitPercent, 1, 99, 50);
  const v0: AbTestVariantStored = {
    id: normalizeAbVariantId("ab_legacy_a", salt, 0, "A"),
    key: "A",
    discountRules: [
      {
        count: 2,
        discountPercent: ga,
        title: "A",
        subtitle: "",
        badge: "A",
        isDefault: true,
      },
    ],
  };
  const v1: AbTestVariantStored = {
    id: normalizeAbVariantId("ab_legacy_b", salt, 1, "B"),
    key: "B",
    discountRules: [
      {
        count: 2,
        discountPercent: gb,
        title: "B",
        subtitle: "",
        badge: "B",
        isDefault: false,
      },
    ],
  };
  return {
    salt,
    allocationMode: "custom",
    trafficWeights: [sp, 100 - sp],
    variants: [v0, v1],
    groupADiscountPercent: ga,
    groupBDiscountPercent: gb,
    bucketSplitPercent: sp,
  };
}
