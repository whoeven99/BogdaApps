import { CartInput } from "../../generated/api";

/** 压缩格式(v2)的单 offer：短键 + 内联对象（见后台 offerPayload COMPACT_OFFERS_FORMAT_VERSION）。 */
export type CompactOfferWire = {
  i?: string;
  c?: string;
  t?: string;
  x?: boolean;
  b?: string;
  e?: string;
  s?: unknown;
  d?: unknown;
  o?: unknown;
};

export type OfferMetafieldPayload = {
  v?: number;
  updatedAt?: string;
  offers?: Array<Offer | CompactOfferWire>;
};

export type MetafieldSnapshot = {
  jsonValue?: unknown;
  value?: unknown;
  type?: string;
} | null | undefined;

export type BxgyDiscountRule = {
  count: number;
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  discountPercent: number;
  maxUsesPerOrder: number;
  tierType?: "single" | "bxgy" | "simple";
};

/** 运行期使用的 offer 形状（旧格式直接命中；压缩格式经 expandCompactOffer 还原为此形状）。 */
export type Offer = {
  id?: string;
  name?: string;
  cartTitle?: string;
  status?: boolean;
  startTime?: string;
  endTime?: string;
  selectedProductsJson?: string | null;
  discountRulesJson?: string | null;
  offerSettingsJson?: string | null;
  offerType?: string;
};

export type IndexedCartLine = {
  line: CartInput["cart"]["lines"][number];
  unitPrice: number;
  quantity: number;
  productLookupKey: string;
  variantLookupKey: string;
};

export type CouponAccess = {
  enabled: boolean;
  code: string;
};

export type ParsedOfferSettings = {
  markets: string;
  customerSegments: string[];
  customerProfileFilters: string[];
  ipCountryCodes: string[];
  couponAccess: CouponAccess;
  quantityEnabled: boolean;
};

export type CompiledOfferRuntime = {
  offer: Offer;
  settings: ParsedOfferSettings;
  selectedIds: string[];
  /** 预计算的 numeric product/variant lookup key，避免大 product 池上的 O(n) 线性扫描。 */
  selectedLookupKeys: Set<string>;
  /** 大商品池紧凑字段 `p`（逗号分隔），避免 split/Set 带来的 WASM 指令爆炸。 */
  packedSelectedPool: string | null;
  standardRules: DiscountTier[];
  bxgyRules: BxgyDiscountRule[];
  hasUnifiedBxgyTier: boolean;
};

/** complete-bundle：整包计价方式（与主题端 offerParsing 对齐） */
export type CompleteBundlePricingMode =
  | "full_price"
  | "percentage_off"
  | "amount_off"
  | "fixed_price";

export type CompleteBundleProductRow = {
  productId: string;
  selectedVariantId?: string;
  selectionMode?: "product" | "variant";
  pricing: { mode: CompleteBundlePricingMode; value: number };
};

export type CompleteBundleBarRow = {
  id: string;
  type?: "single" | "quantity-break-same";
  minQuantity: number;
  maxQuantity: number;
  excludeTriggerProduct: boolean;
  pricing: { mode: CompleteBundlePricingMode; value: number };
  products: CompleteBundleProductRow[];
};

export type CartLineForBundle = CartInput["cart"]["lines"][number];

export type CompleteBundleAllocation = {
  lineId: string;
  unitBase: number;
  quantity: number;
};

export type DiscountTier = {
  count: number;
  discountPercent: number;
  discountClass: "product" | "order" | "shipping";
  conditionType: "item_quantity" | "cart_amount";
  amountThreshold?: number;
  rewardType: "percentage_off" | "gift_product" | "free_shipping";
  giftQuantity?: number;
  logicType: "standard" | "bxgy";
  buyQuantity?: number;
  getQuantity?: number;
  maxUsesPerOrder?: number;
  rewardProductIds: string[];
};

export type BuyerTargetingContext = {
  isAuthenticated: boolean;
  numberOfOrders: number;
  amountSpent: number;
  tags: Set<string>;
  hasSubscriptionLine: boolean;
};

/** 超过此数量时不逐条展开 lookup index，改为运行时 Set 命中（避免 WASM 指令爆炸）。 */
export const LARGE_PRODUCT_POOL_INLINE_INDEX_MAX = 40;

export type RegularOfferIndex = {
  matchAllOffers: CompiledOfferRuntime[];
  byLookupKey: Map<string, CompiledOfferRuntime[]>;
  largePoolOffers: CompiledOfferRuntime[];
};
