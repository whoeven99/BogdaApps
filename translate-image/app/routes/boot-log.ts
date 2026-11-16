import type { ActionFunctionArgs } from "@remix-run/node";
import { bootMark } from "~/server/bootTrace.server";

/** 浏览器首屏探针。不走 Shopify 鉴权，这样白屏时也能打到 Render。 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const raw = await request.text();
  let stage = "unknown";
  let path = "";
  let extra = "";
  try {
    const body = JSON.parse(raw) as {
      stage?: unknown;
      path?: unknown;
      extra?: unknown;
    };
    stage = String(body.stage ?? "unknown").slice(0, 80);
    path = String(body.path ?? "").slice(0, 120);
    extra = String(body.extra ?? "").slice(0, 300);
  } catch {
    extra = raw.slice(0, 200);
  }
  bootMark(`client ${stage}`, `${path} ${extra}`.trim());
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
};
