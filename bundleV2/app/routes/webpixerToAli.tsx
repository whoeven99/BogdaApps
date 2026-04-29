import Client from "@alicloud/log";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { createHash } from "crypto";
import { getBogdaRate, redis } from "../redis.server";
import { unauthenticated } from "../shopify.server";

/** 勿在模块顶层 new Client：无凭证时 @alicloud/log 会抛错，导致整条路由 SSR 加载失败。 */
function createSlsClient(): Client | null {
  const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID?.trim();
  const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET?.trim();
  const endpoint = process.env.ALIBABA_CLOUD_ENDPOINT?.trim();
  if (!accessKeyId || !accessKeySecret || !endpoint) {
    return null;
  }
  return new Client({
    accessKeyId,
    accessKeySecret,
    endpoint,
    region: process.env.ALIBABA_CLOUD_REGION || "us-west-1",
  });
}

const projectName = () => process.env.ALIBABA_CLOUD_PROJECT || "ciwi-log";
const logstoreName = () => process.env.ALIBABA_CLOUD_LOGSTORE || "bogdatech-prod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type SlsContentItem = { key?: unknown; value?: unknown };
type SlsLogLike = {
  contents?: SlsContentItem[];
  content?: Record<string, unknown>;
  time?: unknown;
  timestamp?: unknown;
  __time__?: unknown;
};

type OverviewMetrics = {
  totalGmv: number;
  conversion: number;
  visitor: number;
  bundleOrders: number;
  exposurePv: number;
  orderPv: number;
};

type DailyGmvPoint = {
  date: string;
  gmv: number;
};

const NO_BUNDLE_TITLE = "NO_BUNDLE_TITLE";
const AB_TEST_REDIS_TTL_SECONDS = 30 * 24 * 60 * 60;

type AbTestGroup = "abtest1" | "abtest2";

function parseJsonArrayOfStrings(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x ?? "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function parseJsonArrayOfNumbers(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

/** 按 cumulative 权重将 0–99 的 bucket 映射到 variant 下标 */
function resolveVariantIndexByWeights(bucket: number, weights: number[]): number {
  const w = weights.length ? weights : [50, 50];
  let cum = 0;
  const b = Math.max(0, Math.min(99, Math.trunc(bucket)));
  for (let i = 0; i < w.length; i += 1) {
    cum += Math.max(0, Math.trunc(w[i]));
    if (b < cum) return i;
  }
  return Math.max(0, w.length - 1);
}

function getAbSaltFromEnvOrRandom(): string {
  const envSalt = String(process.env.AB_TEST_SALT || "").trim();
  if (envSalt) return envSalt;
  return createHash("sha256")
    .update(`${Date.now()}-${Math.random()}`)
    .digest("hex")
    .slice(0, 32);
}

function computeAbBucketByHash(customerId: string, salt: string): number {
  const digest = createHash("sha256")
    .update(`${customerId}:${salt}`)
    .digest("hex");
  const lastTwoHex = digest.slice(-2);
  const n = Number.parseInt(lastTwoHex, 16);
  if (!Number.isFinite(n)) return 0;
  return n % 100;
}

function resolveAbGroupByBucket(bucket: number, splitPercent: number): AbTestGroup {
  const split = Math.max(1, Math.min(99, Math.trunc(splitPercent || 50)));
  return bucket < split ? "abtest1" : "abtest2";
}

function resolveAbGroupOrVariantId(params: {
  bucket: number;
  splitPercent: number;
  variantIds: string[];
  trafficWeights: number[];
}): string {
  const { bucket, splitPercent, variantIds, trafficWeights } = params;
  if (variantIds.length >= 2 && trafficWeights.length === variantIds.length) {
    const idx = resolveVariantIndexByWeights(bucket, trafficWeights);
    return variantIds[idx] || variantIds[0] || "abtest1";
  }
  return resolveAbGroupByBucket(bucket, splitPercent);
}

function buildAbRedisKey(shopName: string, offerId: string, identityKey: string): string {
  return `ciwi:abtest:${shopName}:${offerId}:${identityKey}`;
}

function parseTime(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    // SLS time is usually seconds.
    return input > 1_000_000_000_000 ? input : input * 1000;
  }
  if (typeof input === "string") {
    const asNum = Number(input);
    if (Number.isFinite(asNum)) {
      return asNum > 1_000_000_000_000 ? asNum : asNum * 1000;
    }
    const asDate = Date.parse(input);
    if (Number.isFinite(asDate)) return asDate;
  }
  return null;
}

function toNumber(input: unknown): number {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const n = Number(input);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function computeNormalApprox95Ci(successes: number, total: number): {
  low: number;
  high: number;
} {
  const n = Math.max(1, Math.trunc(total));
  const p = Math.max(0, Math.min(1, successes / n));
  const se = Math.sqrt((p * (1 - p)) / n);
  const z = 1.96;
  return {
    low: Math.max(0, p - z * se),
    high: Math.min(1, p + z * se),
  };
}

function parseExtra(extraRaw: unknown): Record<string, unknown> {
  if (typeof extraRaw !== "string") return {};
  try {
    const parsed = JSON.parse(extraRaw);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }
  return {};
}

function extractLogContent(log: SlsLogLike): Record<string, string> {
  if (log.content && typeof log.content === "object") {
    const entries = Object.entries(log.content).map(([k, v]) => [k, String(v ?? "")]);
    return Object.fromEntries(entries);
  }
  if (Array.isArray(log.contents)) {
    const contentObj: Record<string, string> = {};
    for (const item of log.contents) {
      const key = String(item?.key ?? "");
      if (!key) continue;
      contentObj[key] = String(item?.value ?? "");
    }
    return contentObj;
  }
  return {};
}

function hasBundle(extra: Record<string, unknown>): boolean {
  const bundle = Array.isArray(extra.bundle) ? extra.bundle : [];
  return bundle.some((item) => {
    if (!item || typeof item !== "object") return false;
    const title = String((item as Record<string, unknown>).title ?? "");
    const id = String((item as Record<string, unknown>).id ?? "");
    return !!id && title !== NO_BUNDLE_TITLE;
  });
}

function getTotalPrice(extra: Record<string, unknown>): number {
  const totalPrice = extra.totalPrice;
  if (!totalPrice || typeof totalPrice !== "object") return 0;
  const amount = (totalPrice as Record<string, unknown>).amount;
  return toNumber(amount);
}

function formatDayKey(input: Date): string {
  const y = input.getUTCFullYear();
  const m = String(input.getUTCMonth() + 1).padStart(2, "0");
  const d = String(input.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type SlsSqlQueryResult = {
  day: string;
  currency: string;
  total_amount: number;
};

function buildDailyGmvTrend(
  queryResult: SlsSqlQueryResult[],
  fromDate: Date,
  toDate: Date,
): DailyGmvPoint[] {
  // 使用Map来存储每日的GMV总额。键是日期字符串（如 '2023-10-26'），值是累计的GMV
  const dailyGmv = new Map<string, number>();
  const rates = getBogdaRate();
  const usdRate = rates ? parseFloat(rates["USD"]) : null;
  // 遍历SLS返回的每一行聚合数据
  for (const row of queryResult) {
    // 从行数据中安全地提取日期和销售额
    const dayKey = row.day;
    let amount = Number(row.total_amount) || 0;
    const currency = row.currency;
    // 如果日期或金额无效，则跳过此行
    if (!dayKey || !amount) {
      continue;
    }

    if (currency !== "USD" && rates && usdRate && rates[currency]) {
      const currencyRate = parseFloat(rates[currency]);
      if (!isNaN(currencyRate) && currencyRate > 0) {
        amount = (amount / currencyRate) * usdRate;
      }
    }
    // 将当前行的销售额累加到对应日期的GMV总额中
    // 如果Map中还没有这一天的记录，会使用 (dailyGmv.get(dayKey) ?? 0) 初始化为0
    dailyGmv.set(dayKey, (dailyGmv.get(dayKey) ?? 0) + amount);
  }

  // 打印处理后的每日GMV数据，以便调试
  console.log(
    "[buildDailyGmvTrend] Processed daily GMV totals",
    Object.fromEntries(dailyGmv),
  );

  // 初始化一个数组来存储最终的时间序列数据点
  const series: DailyGmvPoint[] = [];
  // 创建一个日期对象，用于在指定的时间范围内迭代
  const cursor = new Date(fromDate);
  cursor.setUTCHours(0, 0, 0, 0); // 标准化到当天的开始

  const toDay = new Date(toDate);
  toDay.setUTCHours(0, 0, 0, 0); // 标准化到查询结束日期的开始

  // 循环遍历从开始日期到结束日期的每一天
  while (cursor.getTime() <= toDay.getTime()) {
    // 将当前日期格式化为 'YYYY-MM-DD' 格式的字符串
    const dayKey = formatDayKey(cursor);
    // 从Map中获取当天的GMV，如果当天没有销售额，则默认为0
    const gmv = dailyGmv.get(dayKey) ?? 0;

    // 将日期和对应的GMV作为一个数据点添加到时间序列数组中
    // gmv.toFixed(2)确保金额格式为两位小数
    series.push({
      date: dayKey,
      gmv: Number(gmv.toFixed(2)),
    });

    // 将日期向前推一天，继续下一轮循环
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // 返回构建好的时间序列
  return series;
}

function buildOverviewMetrics(
  logs: SlsLogLike[],
  shopName: string,
  fromDate: Date,
  toDate: Date,
): OverviewMetrics {
  let exposurePv = 0;
  let orderPv = 0;
  let totalGmv = 0;
  let bundleOrders = 0;
  const exposureDailyVisitors = new Map<string, Set<string>>();

  for (const rawLog of logs) {
    const content = extractLogContent(rawLog);
    if (!content.shopName || content.shopName !== shopName) continue;

    const timestampMs =
      parseTime(rawLog.time) ?? parseTime(rawLog.timestamp) ?? parseTime(rawLog.__time__);
    if (!timestampMs) continue;
    if (timestampMs < fromDate.getTime() || timestampMs > toDate.getTime()) continue;

    const event = content.event;
    const clientId = content.clientId || "";
    const extra = parseExtra(content.extra);

    if (event === "product_viewed") {
      exposurePv += 1;
      const dayKey = new Date(timestampMs).toISOString().slice(0, 10);
      const visitors = exposureDailyVisitors.get(dayKey) ?? new Set<string>();
      if (clientId) visitors.add(clientId);
      exposureDailyVisitors.set(dayKey, visitors);
      continue;
    }

    if (event === "checkout_completed" && hasBundle(extra)) {
      orderPv += 1;
      bundleOrders += 1;
      totalGmv += getTotalPrice(extra);
    }
  }

  const visitor = Array.from(exposureDailyVisitors.values()).reduce(
    (sum, set) => sum + set.size,
    0,
  );
  const conversion = exposurePv > 0 ? orderPv / exposurePv : 0;

  return {
    totalGmv,
    conversion,
    visitor,
    bundleOrders,
    exposurePv,
    orderPv,
  };
}

function escapeSlsString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function runSlsSql(
  sls: Client,
  fromDate: Date,
  toDate: Date,
  sql: string,
  label: string,
): Promise<Record<string, unknown>> {
  console.log("[web-pixel][overview-query] SLS SQL", { label, sql });
  const resp = (await sls.getLogs(projectName(), logstoreName(), fromDate, toDate, {
    query: sql,
    line: 100,
    reverse: false,
  })) as unknown;

  const rows = Array.isArray(resp)
    ? (resp as Record<string, unknown>[])
    : Array.isArray((resp as { logs?: unknown })?.logs)
      ? (((resp as { logs?: unknown[] }).logs ?? []) as Record<string, unknown>[])
      : [];
  const firstRow = rows[0] ?? {};
  console.log("[web-pixel][overview-query] SLS SQL result", {
    label,
    rows: rows.length,
    firstRow,
  });
  return firstRow;
}

async function runSlsSqlRows(
  sls: Client,
  fromDate: Date,
  toDate: Date,
  sql: string,
  label: string,
): Promise<Record<string, unknown>[]> {
  console.log("[web-pixel][overview-query][abTest] SLS SQL rows", { label, sql });
  const resp = (await sls.getLogs(projectName(), logstoreName(), fromDate, toDate, {
    query: sql,
    line: 1000,
    reverse: false,
  })) as unknown;
  const rows = Array.isArray(resp)
    ? (resp as Record<string, unknown>[])
    : Array.isArray((resp as { logs?: unknown })?.logs)
      ? (((resp as { logs?: unknown[] }).logs ?? []) as Record<string, unknown>[])
      : [];
  console.log("[web-pixel][overview-query][abTest] SLS SQL rows result", {
    label,
    rows: rows.length,
    firstRow: rows[0] ?? {},
  });
  return rows;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const mode = String(url.searchParams.get("mode") || "").trim();
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (request.method === "GET" && mode === "abtest-assign") {
    console.log("[abtest] assign — loader entry", {
      method: request.method,
      mode,
      fullUrl: request.url,
      origin: url.origin,
      pathname: url.pathname,
      queryKeys: [...url.searchParams.keys()],
    });
    const shopName = String(url.searchParams.get("shopName") || "").trim();
    const offerId = String(url.searchParams.get("offerId") || "").trim();
    const customerId = String(url.searchParams.get("customerId") || "").trim();
    const anonId = String(url.searchParams.get("anonId") || "").trim();
    const splitPercent = Number(url.searchParams.get("splitPercent") || "50");
    const variantIds = parseJsonArrayOfStrings(
      String(url.searchParams.get("variantIds") || "[]"),
    );
    const trafficWeights = parseJsonArrayOfNumbers(
      String(url.searchParams.get("trafficWeights") || "[]"),
    );
    const salt = String(url.searchParams.get("salt") || "").trim() || getAbSaltFromEnvOrRandom();
    const identityKey = customerId ? `customer:${customerId}` : `anon:${anonId}`;

    console.log("[abtest] assign request", {
      shopName,
      offerId,
      customerId,
      anonId,
      splitPercent,
      variantIdsCount: variantIds.length,
      trafficWeightsCount: trafficWeights.length,
      identityKey,
    });
    console.log("[abtest] customerId resolved", { customerId: customerId || null });

    if (!shopName || !offerId || (!customerId && !anonId)) {
      const errBody = {
        success: false,
        message: "shopName/offerId/customerId|anonId is required",
        received: { shopName, offerId, hasCustomerId: Boolean(customerId), hasAnonId: Boolean(anonId) },
      };
      console.warn("[abtest] assign — validation failed", errBody);
      return new Response(JSON.stringify(errBody), { status: 400, headers: corsHeaders });
    }

    const redisKey = buildAbRedisKey(shopName, offerId, identityKey);
    try {
      const existing = await redis.get(redisKey);
      if (existing) {
        const parsed = JSON.parse(existing) as Record<string, unknown>;
        console.log("[abtest] assign cache hit", { redisKey, parsed });
        return new Response(
          JSON.stringify({
            success: true,
            source: "redis",
            group: parsed.group,
            bucket: parsed.bucket,
            salt: parsed.salt || salt,
            splitPercent: parsed.splitPercent ?? splitPercent,
            variantIds: parsed.variantIds,
            trafficWeights: parsed.trafficWeights,
          }),
          { status: 200, headers: corsHeaders },
        );
      }
    } catch (error) {
      console.error("[abtest] read redis failed", { redisKey, error: String(error) });
    }

    const isCustomer = Boolean(customerId);
    const bucket = isCustomer
      ? computeAbBucketByHash(customerId, salt)
      : Math.floor(Math.random() * 100);
    const group = resolveAbGroupOrVariantId({
      bucket,
      splitPercent,
      variantIds,
      trafficWeights,
    });
    const payload = {
      group,
      bucket,
      salt,
      splitPercent: Math.max(1, Math.min(99, Math.trunc(splitPercent || 50))),
      variantIds: variantIds.length >= 2 ? variantIds : undefined,
      trafficWeights:
        variantIds.length >= 2 && trafficWeights.length === variantIds.length
          ? trafficWeights
          : undefined,
      identityKey,
      assignedAt: Date.now(),
      source: isCustomer ? "hash" : "random_first_touch",
    };

    try {
      await redis.set(redisKey, JSON.stringify(payload), "EX", AB_TEST_REDIS_TTL_SECONDS);
    } catch (error) {
      console.error("[abtest] write redis failed", { redisKey, error: String(error) });
    }

    console.log("[abtest] assign — computed new assignment", {
      redisKey,
      group: payload.group,
      bucket: payload.bucket,
      source: payload.source,
    });
    return new Response(
      JSON.stringify({ success: true, ...payload }),
      { status: 200, headers: corsHeaders },
    );
  }

  if (request.method === "GET" && mode === "abtest-bind-order") {
    const shopName = String(url.searchParams.get("shopName") || "").trim();
    const offerId = String(url.searchParams.get("offerId") || "").trim();
    const orderId = String(url.searchParams.get("orderId") || "").trim();
    const anonId = String(url.searchParams.get("anonId") || "").trim();
    const splitPercent = Number(url.searchParams.get("splitPercent") || "50");
    const variantIds = parseJsonArrayOfStrings(
      String(url.searchParams.get("variantIds") || "[]"),
    );
    const trafficWeights = parseJsonArrayOfNumbers(
      String(url.searchParams.get("trafficWeights") || "[]"),
    );
    const salt = String(url.searchParams.get("salt") || "").trim() || getAbSaltFromEnvOrRandom();
    if (!shopName || !offerId || !orderId || !anonId) {
      return new Response(
        JSON.stringify({ success: false, message: "shopName/offerId/orderId/anonId is required" }),
        { status: 400, headers: corsHeaders },
      );
    }

    try {
      const { admin } = await unauthenticated.admin(shopName);
      const query = `#graphql
query GetOrderCustomerId($id: ID!) {
  order(id: $id) {
    id
    name
    customer {
      id
    }
  }
}`;
      console.log("[abtest] GetOrderCustomerId query", { query, orderId, shopName });
      const response = await admin.graphql(query, { variables: { id: orderId } });
      const json = await response.json();
      console.log("[abtest] GetOrderCustomerId result", json);
      const customerId = String(json?.data?.order?.customer?.id || "").trim();
      if (!customerId) {
        return new Response(
          JSON.stringify({ success: false, message: "order has no customer id" }),
          { status: 404, headers: corsHeaders },
        );
      }

      const customerBucket = computeAbBucketByHash(customerId, salt);
      const customerGroup = resolveAbGroupOrVariantId({
        bucket: customerBucket,
        splitPercent,
        variantIds,
        trafficWeights,
      });
      const anonKey = buildAbRedisKey(shopName, offerId, `anon:${anonId}`);
      const customerKey = buildAbRedisKey(shopName, offerId, `customer:${customerId}`);

      let finalGroup = customerGroup;
      let finalBucket = customerBucket;
      try {
        const existingAnon = await redis.get(anonKey);
        if (existingAnon) {
          const parsedAnon = JSON.parse(existingAnon) as Record<string, unknown>;
          if (typeof parsedAnon.group === "string" && typeof parsedAnon.bucket === "number") {
            finalGroup = String(parsedAnon.group);
            finalBucket = Number(parsedAnon.bucket);
          }
        }
      } catch (error) {
        console.error("[abtest] read anon redis failed", { anonKey, error: String(error) });
      }

      const payload = {
        group: finalGroup,
        bucket: finalBucket,
        splitPercent: Math.max(1, Math.min(99, Math.trunc(splitPercent || 50))),
        variantIds: variantIds.length >= 2 ? variantIds : undefined,
        trafficWeights:
          variantIds.length >= 2 && trafficWeights.length === variantIds.length
            ? trafficWeights
            : undefined,
        salt,
        customerId,
        source: "bind_order_keep_first_random",
        assignedAt: Date.now(),
      };
      await redis.set(customerKey, JSON.stringify(payload), "EX", AB_TEST_REDIS_TTL_SECONDS);
      return new Response(JSON.stringify({ success: true, ...payload }), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error("[abtest] bind order failed", {
        shopName,
        offerId,
        orderId,
        anonId,
        error: String(error),
      });
      return new Response(
        JSON.stringify({ success: false, message: String(error) }),
        { status: 500, headers: corsHeaders },
      );
    }
  }

  if (request.method === "GET" && mode === "abtest-offer-summary") {
    const shopName = String(url.searchParams.get("shopName") || "").trim();
    const offerId = String(url.searchParams.get("offerId") || "").trim();
    const fromRaw = url.searchParams.get("from");
    const toRaw = url.searchParams.get("to");
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = fromRaw ? new Date(fromRaw) : defaultFrom;
    const toDate = toRaw ? new Date(toRaw) : now;

    if (!shopName || !offerId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "shopName and offerId are required",
        }),
        { status: 400, headers: corsHeaders },
      );
    }
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return new Response(
        JSON.stringify({ success: false, message: "invalid from/to date" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const sls = createSlsClient();
    if (!sls) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Missing Alibaba Log credentials (ALIBABA_CLOUD_ACCESS_KEY_ID, ALIBABA_CLOUD_ACCESS_KEY_SECRET, ALIBABA_CLOUD_ENDPOINT)",
        }),
        { status: 503, headers: corsHeaders },
      );
    }

    try {
      const safeShopName = escapeSlsString(shopName);
      const safeOfferId = escapeSlsString(offerId);

      const exposureSql = `__topic__: "product_viewed" and shopName: "${safeShopName}" and extra: "${safeOfferId}" | set session mode=scan; SELECT JSON_EXTRACT_SCALAR(bundle_item, '$.abGroup') AS ab_group, COUNT(DISTINCT clientId) AS exposure_users FROM log CROSS JOIN UNNEST(CAST(JSON_EXTRACT(extra, '$.bundle') AS ARRAY(JSON))) AS t(bundle_item) WHERE JSON_EXTRACT_SCALAR(bundle_item, '$.offerId') = '${safeOfferId}' AND JSON_EXTRACT_SCALAR(bundle_item, '$.title') != '${NO_BUNDLE_TITLE}' AND JSON_EXTRACT_SCALAR(bundle_item, '$.abGroup') IS NOT NULL GROUP BY JSON_EXTRACT_SCALAR(bundle_item, '$.abGroup')`;

      const checkoutSql = `__topic__: "checkout_completed" and shopName: "${safeShopName}" and extra: "${safeOfferId}" | set session mode=scan; SELECT JSON_EXTRACT_SCALAR(bundle_item, '$.abGroup') AS ab_group, COUNT(DISTINCT COALESCE(JSON_EXTRACT_SCALAR(extra, '$.orderId'), clientId)) AS checkout_users, ROUND(SUM(CAST(JSON_EXTRACT_SCALAR(bundle_item, '$.price.amount') AS DOUBLE)), 2) AS gmv FROM log CROSS JOIN UNNEST(CAST(JSON_EXTRACT(extra, '$.bundle') AS ARRAY(JSON))) AS t(bundle_item) WHERE JSON_EXTRACT_SCALAR(bundle_item, '$.offerId') = '${safeOfferId}' AND JSON_EXTRACT_SCALAR(bundle_item, '$.title') != '${NO_BUNDLE_TITLE}' AND JSON_EXTRACT_SCALAR(bundle_item, '$.abGroup') IS NOT NULL GROUP BY JSON_EXTRACT_SCALAR(bundle_item, '$.abGroup')`;

      const [exposureRows, checkoutRows] = await Promise.all([
        runSlsSqlRows(sls, fromDate, toDate, exposureSql, "abtest-exposure-by-group"),
        runSlsSqlRows(sls, fromDate, toDate, checkoutSql, "abtest-checkout-by-group"),
      ]);

      const byGroup = new Map<
        string,
        { key: string; exposureUsers: number; checkoutUsers: number; gmv: number }
      >();
      const ensure = (key: string) => {
        const hit = byGroup.get(key);
        if (hit) return hit;
        const seed = { key, exposureUsers: 0, checkoutUsers: 0, gmv: 0 };
        byGroup.set(key, seed);
        return seed;
      };

      for (const row of exposureRows) {
        const key = String(row.ab_group || "").trim();
        if (!key) continue;
        const acc = ensure(key);
        acc.exposureUsers = toNumber(row.exposure_users);
      }
      for (const row of checkoutRows) {
        const key = String(row.ab_group || "").trim();
        if (!key) continue;
        const acc = ensure(key);
        acc.checkoutUsers = toNumber(row.checkout_users);
        acc.gmv = toNumber(row.gmv);
      }

      const rows = Array.from(byGroup.values()).map((row) => {
        const conversionRate =
          row.exposureUsers > 0 ? row.checkoutUsers / row.exposureUsers : 0;
        const ci = computeNormalApprox95Ci(row.checkoutUsers, row.exposureUsers);
        return {
          key: row.key,
          exposureUsers: row.exposureUsers,
          checkoutUsers: row.checkoutUsers,
          gmv: Number(row.gmv.toFixed(2)),
          conversionRate,
          ciLow: ci.low,
          ciHigh: ci.high,
        };
      });

      return new Response(
        JSON.stringify({
          success: true,
          offerId,
          rows,
          range: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
        }),
        { status: 200, headers: corsHeaders },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: String(error),
        }),
        { status: 500, headers: corsHeaders },
      );
    }
  }

  if (request.method === "GET" && url.searchParams.get("mode") === "overview") {
    const shopName = String(url.searchParams.get("shopName") || "");
    const fromRaw = url.searchParams.get("from");
    const toRaw = url.searchParams.get("to");
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = fromRaw ? new Date(fromRaw) : defaultFrom;
    const toDate = toRaw ? new Date(toRaw) : now;

    if (!shopName) {
      return new Response(
        JSON.stringify({ success: false, message: "shopName is required" }),
        { status: 400, headers: corsHeaders },
      );
    }
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return new Response(
        JSON.stringify({ success: false, message: "invalid from/to date" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const sls = createSlsClient();
    if (!sls) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Missing Alibaba Log credentials (ALIBABA_CLOUD_ACCESS_KEY_ID, ALIBABA_CLOUD_ACCESS_KEY_SECRET, ALIBABA_CLOUD_ENDPOINT)",
        }),
        { status: 503, headers: corsHeaders },
      );
    }

    // Lightweight sanity check: verify we can read the target logstore metadata.
    try {
      const logstoreMeta = (await sls.getLogStore(
        projectName(),
        logstoreName(),
      )) as Record<string, unknown>;
      console.log("[web-pixel][overview-query] SLS instance sanity", {
        project: projectName(),
        logstore: logstoreName(),
        endpoint: process.env.ALIBABA_CLOUD_ENDPOINT || "",
        region: process.env.ALIBABA_CLOUD_REGION || "us-west-1",
        ttl: logstoreMeta?.ttl ?? null,
        shardCount: logstoreMeta?.shardCount ?? null,
      });
    } catch (metaError) {
      console.error("[web-pixel][overview-query] SLS instance sanity failed", {
        project: projectName(),
        logstore: logstoreName(),
        endpoint: process.env.ALIBABA_CLOUD_ENDPOINT || "",
        region: process.env.ALIBABA_CLOUD_REGION || "us-west-1",
        error: String(metaError),
      });
    }

    try {
      console.log("[web-pixel][overview-query] SLS query config", {
        project: projectName(),
        logstore: logstoreName(),
        endpoint: process.env.ALIBABA_CLOUD_ENDPOINT || "",
        region: process.env.ALIBABA_CLOUD_REGION || "us-west-1",
        shopName,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        mode: "sls-sql-aggregation",
        sqlLabels: ["exposure", "order", "bundle-order", "gmv"],
      });

      const safeShopName = escapeSlsString(shopName);
      const bundleName = url.searchParams.get("name");
      const safeBundleName = bundleName ? escapeSlsString(bundleName) : null;

      let exposureSql = `__topic__: "product_viewed" and shopName: "${safeShopName}"`;
      if (safeBundleName) {
        if (safeBundleName === "bundle") {
          exposureSql += ' and extra: "bundle" and not extra: "NO_BUNDLE_TITLE"';
        } else {
          exposureSql += ` and extra: "${safeBundleName}"`;
        }
      }
      exposureSql += ` | SELECT COUNT(1) AS exposure_pv, COUNT(DISTINCT clientId) AS exposure_uv`;

      let bundleExposureSql = `__topic__: "product_viewed" and shopName: "${safeShopName}" and extra: "bundle" and not extra: "NO_BUNDLE_TITLE"`;
      if (safeBundleName) {
        bundleExposureSql += ` and extra: "${safeBundleName}"`;
      }
      bundleExposureSql += ` | SELECT COUNT(*) AS total_count`;

      let orderSql = `__topic__: "checkout_completed" and shopName: "${safeShopName}"`;
      if (safeBundleName) {
        orderSql += ` and extra: "${safeBundleName}"`;
      }
      orderSql += ` | SELECT COUNT(1) AS order_pv`;

      let bundleOrderSql = `__topic__: "checkout_completed" and shopName: "${safeShopName}" and extra: "bundle"`;
      if (safeBundleName) {
        bundleOrderSql += ` and extra: "${safeBundleName}"`;
      }
      bundleOrderSql += ` | set session mode=scan; SELECT COUNT(*) AS bundle_orders FROM log CROSS JOIN UNNEST(CAST(JSON_EXTRACT(extra, '$.bundle') AS ARRAY(JSON))) AS t(bundle_item) WHERE JSON_EXTRACT_SCALAR(bundle_item, '$.title') != 'NO_BUNDLE_TITLE'${safeBundleName ? ` AND JSON_EXTRACT_SCALAR(bundle_item, '$.title') LIKE '%${safeBundleName}%'` : ''}`;

      let gmvSql = `__topic__: "checkout_completed" and shopName: "${safeShopName}" and extra: "bundle"`;
      if (safeBundleName) {
        gmvSql += ` and extra: "${safeBundleName}"`;
      }
      gmvSql += ` | set session mode=scan; SELECT ROUND(SUM(CAST(JSON_EXTRACT_SCALAR(bundle_item, '$.price.amount') AS DOUBLE)), 2) AS total_gmv FROM log CROSS JOIN UNNEST(CAST(JSON_EXTRACT(extra, '$.bundle') AS ARRAY(JSON))) AS t(bundle_item) WHERE JSON_EXTRACT_SCALAR(bundle_item, '$.title') != 'NO_BUNDLE_TITLE'${safeBundleName ? ` AND JSON_EXTRACT_SCALAR(bundle_item, '$.title') LIKE '%${safeBundleName}%'` : ''}`;

      const [exposureAgg, bundleExposureAgg, orderAgg, bundleOrderAgg, gmvAgg] = await Promise.all([
        runSlsSql(sls, fromDate, toDate, exposureSql, "exposure"),
        runSlsSql(sls, fromDate, toDate, bundleExposureSql, "bundle-exposure"),
        runSlsSql(sls, fromDate, toDate, orderSql, "order"),
        runSlsSql(sls, fromDate, toDate, bundleOrderSql, "bundle-order"),
        runSlsSql(sls, fromDate, toDate, gmvSql, "gmv"),
      ]);

      const exposurePv = toNumber(exposureAgg.exposure_pv);
      const visitor = toNumber(exposureAgg.exposure_uv);
      const orderPv = toNumber(orderAgg.order_pv);
      const bundleOrders = toNumber(bundleOrderAgg.bundle_orders);
      const totalGmv = toNumber(gmvAgg.total_gmv);
      const conversion = exposurePv > 0 ? orderPv / exposurePv : 0;
      const metrics: OverviewMetrics = {
        totalGmv,
        conversion,
        visitor,
        bundleOrders,
        exposurePv,
        orderPv,
      };

      return new Response(
        JSON.stringify({
          success: true,
          metrics,
          range: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
          sqlRows: {
            exposure: exposureAgg,
            order: orderAgg,
            bundleOrder: bundleOrderAgg,
            gmv: gmvAgg,
          },
        }),
        {
          status: 200,
          headers: corsHeaders,
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: String(error),
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }
  }

  if (request.method === "GET" && url.searchParams.get("mode") === "trend") {
    const shopName = String(url.searchParams.get("shopName") || "");
    const fromRaw = url.searchParams.get("from");
    const toRaw = url.searchParams.get("to");
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromDate = fromRaw ? new Date(fromRaw) : defaultFrom;
    const toDate = toRaw ? new Date(toRaw) : now;

    if (!shopName) {
      return new Response(
        JSON.stringify({ success: false, message: "shopName is required" }),
        { status: 400, headers: corsHeaders },
      );
    }
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return new Response(
        JSON.stringify({ success: false, message: "invalid from/to date" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const sls = createSlsClient();
    if (!sls) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Missing Alibaba Log credentials (ALIBABA_CLOUD_ACCESS_KEY_ID, ALIBABA_CLOUD_ACCESS_KEY_SECRET, ALIBABA_CLOUD_ENDPOINT)",
        }),
        { status: 503, headers: corsHeaders },
      );
    }

    try {
      const safeShopName = escapeSlsString(shopName);
      const bundleName = url.searchParams.get("name");
      const safeBundleName = bundleName ? escapeSlsString(bundleName) : null;

      let query = `__topic__: "checkout_completed" and shopName: "${safeShopName}" and extra: "bundle"`;

      if (safeBundleName) {
        query += ` and extra: "${safeBundleName}"`;
      }

      query += ` | set session mode=scan; SELECT date_format(FROM_UNIXTIME(__time__), '%Y-%m-%d') as day, JSON_EXTRACT_SCALAR(extra, '$.totalPrice.currencyCode') as currency, ROUND(SUM(CAST(JSON_EXTRACT_SCALAR(bundle_item, '$.price.amount') AS DOUBLE)), 2) as total_amount FROM log CROSS JOIN UNNEST(CAST(JSON_EXTRACT(extra, '$.bundle') AS ARRAY(JSON))) AS t(bundle_item) WHERE JSON_EXTRACT_SCALAR(bundle_item, '$.title') != 'NO_BUNDLE_TITLE' AND JSON_EXTRACT_SCALAR(bundle_item, '$.title') LIKE '%${safeBundleName ?? ""}%' GROUP BY date_format(FROM_UNIXTIME(__time__), '%Y-%m-%d'), JSON_EXTRACT_SCALAR(extra, '$.totalPrice.currencyCode') ORDER BY day`;

      const resp = (await sls.getLogs(projectName(), logstoreName(), fromDate, toDate, {
        query,
        line: 1000,
        reverse: false,
      })) as unknown;

      const queryResult = (Array.isArray(resp)
        ? resp
        : Array.isArray((resp as { logs?: unknown })?.logs)
          ? (resp as { logs: unknown[] }).logs
          : []) as { day: string; currency: string; total_amount: number }[];

      const series = buildDailyGmvTrend(queryResult, fromDate, toDate);
      return new Response(
        JSON.stringify({
          success: true,
          series,
          range: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
        }),
        {
          status: 200,
          headers: corsHeaders,
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: String(error),
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }
  }

  if (
    request.method === "GET" &&
    url.searchParams.get("mode") === "dashboard-overview-product-viewed"
  ) {
    const shopName = String(url.searchParams.get("shopName") || "");
    if (!shopName) {
      return new Response(
        JSON.stringify({ success: false, message: "shopName is required" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const sls = createSlsClient();
    if (!sls) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing Alibaba Log credentials",
        }),
        { status: 503, headers: corsHeaders },
      );
    }

    try {
      const today = new Date();
      const prior30 = new Date(new Date().setDate(today.getDate() - 30));
      const safeShopName = escapeSlsString(shopName);

      const productViewedSql = `__topic__: "product_viewed" and shopName: "${safeShopName}" and extra: "bundle" | set session mode=scan; SELECT COUNT(*) AS total_count FROM log CROSS JOIN UNNEST(CAST(JSON_EXTRACT(extra, '$.bundle') AS ARRAY(JSON))) AS t(bundle_item) WHERE JSON_EXTRACT_SCALAR(bundle_item, '$.title') != 'NO_BUNDLE_TITLE'`;

      const [productViewedLast30DaysAgg] = await Promise.all([
        runSlsSql(sls, prior30, today, productViewedSql, "product-viewed-last-30d"),
      ]);

      const totalCount = toNumber(productViewedLast30DaysAgg.total_count);

      return new Response(
        JSON.stringify({
          success: true,
          totalCount,
        }),
        {
          status: 200,
          headers: corsHeaders,
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: String(error),
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }
  }

  if (request.method === "GET" && url.searchParams.get("mode") === "dashboard-overview-gmv") {
    const shopName = String(url.searchParams.get("shopName") || "");
    if (!shopName) {
      return new Response(
        JSON.stringify({ success: false, message: "shopName is required" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const sls = createSlsClient();
    if (!sls) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing Alibaba Log credentials",
        }),
        { status: 503, headers: corsHeaders },
      );
    }

    try {
      const today = new Date();
      const prior30 = new Date(new Date().setDate(today.getDate() - 30));
      const prior60 = new Date(new Date().setDate(today.getDate() - 60));
      const safeShopName = escapeSlsString(shopName);

      const gmvSql = `__topic__: "checkout_completed" and shopName: "${safeShopName}" and extra: "bundle" | set session mode=scan; SELECT JSON_EXTRACT_SCALAR(extra, '$.totalPrice.currencyCode') as currency, sum(cast(JSON_EXTRACT_SCALAR(extra, '$.totalPrice.amount') as double)) as total_amount FROM log CROSS JOIN UNNEST(CAST(JSON_EXTRACT(extra, '$.bundle') AS ARRAY(JSON))) AS t(bundle_item) WHERE JSON_EXTRACT_SCALAR(bundle_item, '$.title') != 'NO_BUNDLE_TITLE' GROUP BY currency`;

      const calculateGmvFromSqlResult = (queryResult: { currency: string; total_amount: number }[]): number => {
        const rates = getBogdaRate();
        const usdRate = rates ? parseFloat(rates["USD"]) : null;
        let totalGmv = 0;

        for (const row of queryResult) {
          let amount = Number(row.total_amount) || 0;
          const currency = row.currency;

          if (currency && currency !== "USD" && rates && usdRate && rates[currency]) {
            const currencyRate = parseFloat(rates[currency]);
            if (!isNaN(currencyRate) && currencyRate > 0) {
              amount = (amount / currencyRate) * usdRate;
            }
          }
          totalGmv += amount;
        }
        return totalGmv;
      };

      const [gmvLast30DaysResp, gmvPrevious30DaysResp] = await Promise.all([
        sls.getLogs(projectName(), logstoreName(), prior30, today, { query: gmvSql, line: 100, reverse: false }),
        sls.getLogs(projectName(), logstoreName(), prior60, prior30, { query: gmvSql, line: 100, reverse: false }),
      ]);

      const gmvLast30DaysResult = (Array.isArray(gmvLast30DaysResp) ? gmvLast30DaysResp : (gmvLast30DaysResp as any)?.logs ?? []) as { currency: string; total_amount: number }[];
      const gmvPrevious30DaysResult = (Array.isArray(gmvPrevious30DaysResp) ? gmvPrevious30DaysResp : (gmvPrevious30DaysResp as any)?.logs ?? []) as { currency: string; total_amount: number }[];

      const totalGmv = calculateGmvFromSqlResult(gmvLast30DaysResult);
      const gmvPrevious30Days = calculateGmvFromSqlResult(gmvPrevious30DaysResult);

      let gmvGrowthRate = 0;
      if (gmvPrevious30Days <= 0 && totalGmv > 0) {
        gmvGrowthRate = totalGmv;
      } else if (gmvPrevious30Days > 0 && totalGmv <= 0) {
        gmvGrowthRate = totalGmv - gmvPrevious30Days;
      } else if (gmvPrevious30Days > 0) {
        gmvGrowthRate = ((totalGmv - gmvPrevious30Days) / gmvPrevious30Days) * 100;
      }

      return new Response(
        JSON.stringify({
          success: true,
          totalGmv,
          gmvGrowthRate,
        }),
        {
          status: 200,
          headers: corsHeaders,
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: String(error),
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }
  }

  if (
    request.method === "GET" &&
    url.searchParams.get("mode") === "dashboard-overview-bundle-orders"
  ) {
    const shopName = String(url.searchParams.get("shopName") || "");
    if (!shopName) {
      return new Response(
        JSON.stringify({ success: false, message: "shopName is required" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const sls = createSlsClient();
    if (!sls) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing Alibaba Log credentials",
        }),
        { status: 503, headers: corsHeaders },
      );
    }

    try {
      const today = new Date();
      const prior30 = new Date(new Date().setDate(today.getDate() - 30));
      const safeShopName = escapeSlsString(shopName);

      const bundleOrdersSql = `__topic__: "checkout_completed" and shopName: "${safeShopName}" and extra: "bundle" | set session mode=scan; SELECT COUNT(*) AS total_count FROM log CROSS JOIN UNNEST(CAST(JSON_EXTRACT(extra, '$.bundle') AS ARRAY(JSON))) AS t(bundle_item) WHERE JSON_EXTRACT_SCALAR(bundle_item, '$.title') != 'NO_BUNDLE_TITLE'`;

      const [bundleOrdersLast30DaysAgg] = await Promise.all([
        runSlsSql(sls, prior30, today, bundleOrdersSql, "bundle-orders-last-30d"),
      ]);

      const totalCount = toNumber(bundleOrdersLast30DaysAgg.total_count);
      return new Response(
        JSON.stringify({
          success: true,
          totalCount,
        }),
        {
          status: 200,
          headers: corsHeaders,
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: String(error),
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }
  }

  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const startedAt = Date.now();
  let data: Record<string, unknown> = {};
  try {
    const raw = await request.text();
    if (raw) data = JSON.parse(raw) as Record<string, unknown>;
  } catch (parseError) {
    console.error("[web-pixel] webpixerToAli invalid json", {
      parseError: String(parseError),
    });
    return new Response(JSON.stringify({ success: false, message: "invalid json body" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const event = String(data?.event ?? "product_view");
  const shopName = String(data?.shopName ?? "");
  const productId = String(data?.productId ?? "");
  const clientId = String(data?.clientId ?? "");
  const extra = String(data?.extra ?? "{}");
  let parsedExtra: Record<string, unknown> = {};
  try {
    parsedExtra = extra ? (JSON.parse(extra) as Record<string, unknown>) : {};
  } catch (error) {
    console.warn("[web-pixel] extra json parse failed", {
      event,
      shopName,
      clientId,
      message: error instanceof Error ? error.message : String(error),
      extraPreview: extra.slice(0, 320),
    });
    parsedExtra = {};
  }
  const bundle = Array.isArray(parsedExtra?.bundle)
    ? (parsedExtra.bundle as Array<Record<string, unknown>>)
    : [];
  const abBundleItems = bundle
    .filter((row) => row && typeof row === "object")
    .map((row) => ({
      offerId: String(row.offerId || ""),
      variantId: String(row.variantId || row.id || ""),
      title: String(row.title || ""),
      abGroup: String(row.abGroup || ""),
      abBucket: Number(row.abBucket),
      abDiscountPercent: Number(row.abDiscountPercent),
    }))
    .filter((row) => row.abGroup);

  console.log("[web-pixel] webpixerToAli request received", {
    event,
    shopName,
    productId,
    clientId,
    extraLength: extra.length,
    bundleItems: bundle.length,
    abBundleItemsCount: abBundleItems.length,
    abBundleItems,
  });

  const slsProjectName = projectName();
  const slsLogstoreName = logstoreName();
  const sls = createSlsClient();
  if (!sls) {
    console.warn(
      "[web-pixel] webpixerToAli: 缺少 ALIBABA_CLOUD_ACCESS_KEY_ID / SECRET / ENDPOINT，未写入 SLS",
    );
    return new Response(
      JSON.stringify({
        success: false,
        message:
          "Missing Alibaba Log credentials (ALIBABA_CLOUD_ACCESS_KEY_ID, ALIBABA_CLOUD_ACCESS_KEY_SECRET, ALIBABA_CLOUD_ENDPOINT)",
      }),
      { status: 503, headers: corsHeaders },
    );
  }

  console.log("[web-pixel] webpixerToAli SLS config", {
    project: slsProjectName,
    logstore: slsLogstoreName,
    endpoint: process.env.ALIBABA_CLOUD_ENDPOINT || "",
    region: process.env.ALIBABA_CLOUD_REGION || "us-west-1",
  });

  try {
    const logGroup = {
      logs: [
        {
          content: {
            event,
            shopName,
            productId,
            clientId,
            extra,
          },
          timestamp: Math.floor(Date.now() / 1000),
        },
      ],
      topic: event,
      source: shopName,
    };
    console.log("[web-pixel] webpixerToAli SLS write start", {
      topic: logGroup.topic,
      source: logGroup.source,
      logsCount: logGroup.logs.length,
      elapsedMs: Date.now() - startedAt,
    });
    await sls.postLogStoreLogs(slsProjectName, slsLogstoreName, logGroup);
    console.log("[web-pixel] webpixerToAli SLS write success", {
      elapsedMs: Date.now() - startedAt,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `${shopName} ${event} success`,
      }),
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    console.error("[web-pixel] webpixerToAli SLS write failed", {
      shopName,
      event,
      elapsedMs: Date.now() - startedAt,
      status: err?.status,
      message: err?.message,
      error: String(error),
    });
    return new Response(
      JSON.stringify({
        success: false,
        message: String(error),
      }),
      {
        status: err?.status || 500,
        headers: corsHeaders,
      },
    );
  }
};
