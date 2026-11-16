const LOG = "[boot]";

/** 首屏阶段日志。不打印 token、hmac、id_token。 */
export function bootRequestShape(request: Request): string {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  return [
    url.pathname,
    shop ? `shop=${shop}` : "no-shop",
    url.searchParams.get("host") ? "host" : "no-host",
    url.searchParams.get("embedded") === "1" ? "embedded" : "no-embedded",
    url.searchParams.get("id_token") ? "id_token" : "no-id_token",
    request.headers.get("authorization") ? "auth-header" : "no-auth-header",
  ].join(" ");
}

export function bootMark(stage: string, detail = ""): void {
  console.info(`${LOG} ${stage}${detail ? ` ${detail}` : ""}`);
}

function pathOnly(value: string): string {
  try {
    return new URL(value, "https://local.invalid").pathname;
  } catch {
    return "(bad-location)";
  }
}

function safeLocation(location: string | null): string {
  if (!location) return "";
  try {
    const url = new URL(location, "https://local.invalid");
    const reload = url.searchParams.get("shopify-reload");
    const reloadPath = reload ? pathOnly(reload) : "";
    return `${url.pathname}${reloadPath ? ` reload=${reloadPath}` : ""}`;
  } catch {
    return "(bad-location)";
  }
}

async function describeThrown(error: unknown): Promise<string> {
  if (!(error instanceof Response)) {
    const message = error instanceof Error ? error.message : String(error);
    return message.slice(0, 200);
  }
  let bytes = -1;
  let appBridge = false;
  try {
    const text = await error.clone().text();
    bytes = text.length;
    appBridge = text.includes("app-bridge.js");
  } catch {
    bytes = -1;
  }
  const location = safeLocation(error.headers.get("location"));
  return [
    `status=${error.status}`,
    `bytes=${bytes}`,
    appBridge ? "app-bridge-html" : "",
    location ? `location=${location}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function bootStep<T>(
  stage: string,
  request: Request,
  run: () => Promise<T>,
): Promise<T> {
  const shape = bootRequestShape(request);
  const started = Date.now();
  bootMark(`${stage} start`, shape);
  const timers = [8_000, 20_000, 45_000].map((ms) =>
    setTimeout(() => {
      bootMark(`${stage} still waiting`, `${shape} ${Date.now() - started}ms`);
    }, ms),
  );
  try {
    const result = await run();
    bootMark(`${stage} done`, `${shape} ${Date.now() - started}ms`);
    return result;
  } catch (error) {
    bootMark(
      `${stage} fail`,
      `${shape} ${Date.now() - started}ms ${await describeThrown(error)}`,
    );
    throw error;
  } finally {
    for (const timer of timers) clearTimeout(timer);
  }
}

export function startBootDocument(request: Request): {
  elapsed: () => number;
  stop: () => void;
} {
  const shape = bootRequestShape(request);
  const started = Date.now();
  bootMark("document start", shape);
  const timers = [8_000, 20_000, 45_000].map((ms) =>
    setTimeout(() => {
      bootMark("document still waiting", `${shape} ${Date.now() - started}ms`);
    }, ms),
  );
  return {
    elapsed: () => Date.now() - started,
    stop: () => {
      for (const timer of timers) clearTimeout(timer);
    },
  };
}

/** 文档一解析就上报，不依赖 Remix 水合。 */
export const BOOT_HTML_PROBE = `<script>(function(){function boot(stage,extra){try{navigator.sendBeacon("/boot-log",JSON.stringify({stage:stage,path:location.pathname,extra:String(extra||"").slice(0,300)}))}catch(e){}}boot("html-parsed");window.addEventListener("error",function(e){boot("window-error",e&&e.message)});window.addEventListener("unhandledrejection",function(e){var r=e&&e.reason;boot("unhandled",r&&r.message?r.message:r)})})();</script>`;
