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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
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
