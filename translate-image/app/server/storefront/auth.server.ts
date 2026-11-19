import crypto from "node:crypto";

/**
 * 校验 Shopify App Proxy HMAC。
 * @see https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies
 */
export function verifyAppProxyHmac(url: URL, apiSecret: string): boolean {
  const rawQuery = url.search.startsWith("?") ? url.search.slice(1) : url.search;
  const sigMatch = rawQuery.match(/(?:^|&)signature=([^&]*)/);
  if (!sigMatch?.[1]) return false;
  const signature = decodeURIComponent(sigMatch[1].replace(/\+/g, " "));

  const grouped = new Map<string, string[]>();
  for (const part of rawQuery.split("&")) {
    if (!part) continue;
    const eqIdx = part.indexOf("=");
    const rawKey = eqIdx === -1 ? part : part.slice(0, eqIdx);
    const rawValue = eqIdx === -1 ? "" : part.slice(eqIdx + 1);
    const key = decodeURIComponent(rawKey.replace(/\+/g, " "));
    if (key === "signature") continue;
    const value = decodeURIComponent(rawValue.replace(/\+/g, " "));
    const list = grouped.get(key) ?? [];
    list.push(value);
    grouped.set(key, list);
  }

  const pairs = [...grouped.entries()]
    .map(([key, values]) => `${key}=${values.join(",")}`)
    .sort();
  const expected = crypto
    .createHmac("sha256", apiSecret)
    .update(pairs.join(""), "utf8")
    .digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch {
    return false;
  }
}
