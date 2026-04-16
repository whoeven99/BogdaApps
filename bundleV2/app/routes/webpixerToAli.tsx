import Client from "@alicloud/log";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

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

export const options = () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
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
  // 打印从SLS接收到的原始聚合数据
  console.log("[buildDailyGmvTrend] Raw SLS query result", queryResult);

  // 使用Map来存储每日的GMV总额。键是日期字符串（如 '2023-10-26'），值是累计的GMV
  const dailyGmv = new Map<string, number>();

  // 遍历SLS返回的每一行聚合数据
  for (const row of queryResult) {
    // 从行数据中安全地提取日期和销售额
    const dayKey = row.day;
    const amount = Number(row.total_amount) || 0;

    // 如果日期或金额无效，则跳过此行
    if (!dayKey || !amount) {
      continue;
    }

    // 将当前行的销售额累加到对应日期的GMV总额中
    // 如果Map中还没有这一天的记录，会使用 (dailyGmv.get(dayKey) ?? 0) 初始化为0
    dailyGmv.set(dayKey, (dailyGmv.get(dayKey) ?? 0) + amount);
  }

  // 打印处理后的每日GMV数据，以便调试
  console.log("[buildDailyGmvTrend] Processed daily GMV totals", Object.fromEntries(dailyGmv));

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

  // 打印最终生成的时间序列数据
  console.log("[buildDailyGmvTrend] Final GMV series", series);

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

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
        exposureSql += ` and extra: "${safeBundleName}"`;
      }
      exposureSql += ` | SELECT COUNT(1) AS exposure_pv, COUNT(DISTINCT clientId) AS exposure_uv`;

      let orderSql = `__topic__: "checkout_completed" and shopName: "${safeShopName}"`;
      if (safeBundleName) {
        orderSql += ` and extra: "${safeBundleName}"`;
      }
      orderSql += ` | SELECT COUNT(1) AS order_pv`;

      let bundleOrderSql = `__topic__: "checkout_completed" and shopName: "${safeShopName}" and extra: "bundle" and not extra: "NO_BUNDLE_TITLE"`;
      if (safeBundleName) {
        bundleOrderSql += ` and extra: "${safeBundleName}"`;
      }
      bundleOrderSql += ` | SELECT COUNT(1) AS bundle_orders`;

      let gmvSql = `__topic__: "checkout_completed" and shopName: "${safeShopName}" and extra: "bundle" and not extra: "NO_BUNDLE_TITLE"`;
      if (safeBundleName) {
        gmvSql += ` and extra: "${safeBundleName}"`;
      }
      gmvSql += ` | SELECT SUM(CAST(REGEXP_EXTRACT(extra, '"amount":"([0-9.]+)"', 1) AS DOUBLE)) AS total_gmv`;

      const [exposureAgg, orderAgg, bundleOrderAgg, gmvAgg] = await Promise.all([
        runSlsSql(sls, fromDate, toDate, exposureSql, "exposure"),
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

      let query = `__topic__: "checkout_completed" and shopName: "${safeShopName}" and extra: "bundle" and not extra: "NO_BUNDLE_TITLE"`;

      if (safeBundleName) {
        query += ` and extra: "${safeBundleName}"`;
      }

      query += ` | set session mode=scan; SELECT date_format(from_unixtime(__time__), '%Y-%m-%d') as day, JSON_EXTRACT_SCALAR(extra, '$.totalPrice.currencyCode') as currency, sum(cast(JSON_EXTRACT_SCALAR(extra, '$.totalPrice.amount') as double)) as total_amount FROM log GROUP BY day, currency ORDER BY day, currency`;

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

      console.log("[web-pixel-TEST] webpixerToAli getLogs", {
        query,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        logsCount: queryResult.length,
        logs: queryResult,
      });

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

  console.log("[web-pixel] webpixerToAli request received", {
    event,
    shopName,
    productId,
    clientId,
    extraLength: extra.length,
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
