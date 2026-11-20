import { createPrivateKey, createSign, randomUUID, type KeyObject } from "node:crypto";

/**
 * Shopify application-only access token（client_credentials + JWT assertion）。
 * Copied from Spark; token stays in process memory. Callers must check install.
 */

export type ShopAppToken = { accessToken: string; scope: string; expiresAt: number };

export type ShopAppTokenConfig = {
  clientId: string;
  keyId: string;
  privateKeyPem: string;
  beforeExchange?: (shop: string) => Promise<void>;
  fetchImpl?: typeof fetch;
  now?: () => number;
  earlyExpiryMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
};

export type ShopAppTokenProvider = {
  getToken(shop: string): Promise<ShopAppToken>;
  invalidate(shop: string): void;
};

export class ShopAppTokenError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message);
    this.name = "ShopAppTokenError";
  }
}

/** 换票 body `error` / `errors: "Unavailable Shop"`（HTTP 403/402）的稳定码。 */
export const UNAVAILABLE_SHOP_TOKEN_CODE = "unavailable_shop";

const ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";
const ASSERTION_TTL_SEC = 60;

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function tokenEndpoint(shop: string): string {
  return `https://${shop}/admin/oauth/access_token`;
}

function normalizePrivateKeyPem(raw: string): string {
  let key = raw.trim().replace(/^["']|["']$/g, "");
  key = key.replace(/\\r\\n|\\n/g, "\n").replace(/\r\n?/g, "\n");
  return key.endsWith("\n") ? key : `${key}\n`;
}

type SigningAlg = { alg: "RS256" | "ES256"; digest: string; ieee: boolean };

function signingAlg(key: KeyObject): SigningAlg {
  if (key.asymmetricKeyType === "rsa") return { alg: "RS256", digest: "RSA-SHA256", ieee: false };
  if (key.asymmetricKeyType === "ec" && key.asymmetricKeyDetails?.namedCurve === "prime256v1") {
    return { alg: "ES256", digest: "SHA256", ieee: true };
  }
  throw new Error("[shop-app-token] use an RSA or P-256 EC private key");
}

function createClientAssertion(input: {
  clientId: string;
  keyId: string;
  privateKey: KeyObject;
  shop: string;
  nowSec: number;
}): string {
  const { alg, digest, ieee } = signingAlg(input.privateKey);
  const header = base64Url(JSON.stringify({ alg, kid: input.keyId }));
  const payload = base64Url(
    JSON.stringify({
      iss: input.clientId,
      sub: input.clientId,
      aud: tokenEndpoint(input.shop),
      iat: input.nowSec,
      exp: input.nowSec + ASSERTION_TTL_SEC,
      jti: randomUUID(),
    }),
  );
  const signer = createSign(digest);
  signer.update(`${header}.${payload}`);
  signer.end();
  const signature = ieee
    ? signer.sign({ key: input.privateKey, dsaEncoding: "ieee-p1363" })
    : signer.sign(input.privateKey);
  return `${header}.${payload}.${base64Url(signature)}`;
}

type TokenResponse = {
  access_token?: unknown;
  scope?: unknown;
  expires_in?: unknown;
  error?: unknown;
  errors?: unknown;
};

function oauthErrorCode(json: TokenResponse): string | null {
  const raw =
    typeof json.error === "string"
      ? json.error
      : typeof json.errors === "string"
        ? json.errors
        : null;
  if (!raw) return null;
  if (/^unavailable shop$/i.test(raw.trim())) return UNAVAILABLE_SHOP_TOKEN_CODE;
  return raw;
}

function parseTokenResponse(shop: string, status: number, json: TokenResponse, nowMs: number): ShopAppToken {
  const code = oauthErrorCode(json);
  const expiresIn = Number(json.expires_in);
  if (status !== 200 || typeof json.access_token !== "string" || !(expiresIn > 0)) {
    throw new ShopAppTokenError(
      `[shop-app-token] exchange failed shop=${shop} status=${status} error=${code ?? "unknown"}`,
      status,
      code,
    );
  }
  return {
    accessToken: json.access_token,
    scope: typeof json.scope === "string" ? json.scope : "",
    expiresAt: nowMs + expiresIn * 1000,
  };
}

function isRetryable(err: unknown): boolean {
  return !(err instanceof ShopAppTokenError) || err.status >= 500;
}

export function createShopAppTokenProvider(config: ShopAppTokenConfig): ShopAppTokenProvider {
  const privateKey = createPrivateKey(normalizePrivateKeyPem(config.privateKeyPem));
  signingAlg(privateKey);
  const fetchImpl = config.fetchImpl ?? fetch;
  const now = config.now ?? Date.now;
  const earlyExpiryMs = config.earlyExpiryMs ?? 5 * 60_000;
  const maxRetries = config.maxRetries ?? 2;
  const retryDelayMs = config.retryDelayMs ?? 500;
  const cache = new Map<string, ShopAppToken>();
  const inflight = new Map<string, Promise<ShopAppToken>>();

  async function requestOnce(shop: string): Promise<ShopAppToken> {
    const resp = await fetchImpl(tokenEndpoint(shop), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: config.clientId,
        client_assertion_type: ASSERTION_TYPE,
        client_assertion: createClientAssertion({
          clientId: config.clientId,
          keyId: config.keyId,
          privateKey,
          shop,
          nowSec: Math.floor(now() / 1000),
        }),
      }),
    });
    const json = (await resp.json().catch(() => ({}))) as TokenResponse;
    return parseTokenResponse(shop, resp.status, json, now());
  }

  async function exchange(shop: string): Promise<ShopAppToken> {
    await config.beforeExchange?.(shop);
    for (let attempt = 0; ; attempt++) {
      try {
        return await requestOnce(shop);
      } catch (err) {
        if (!isRetryable(err) || attempt >= maxRetries) throw err;
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
      }
    }
  }

  function getToken(rawShop: string): Promise<ShopAppToken> {
    const shop = rawShop.trim().toLowerCase();
    const cached = cache.get(shop);
    if (cached && now() < cached.expiresAt - earlyExpiryMs) return Promise.resolve(cached);
    const pending = inflight.get(shop);
    if (pending) return pending;
    const next = exchange(shop)
      .then((token) => {
        cache.set(shop, token);
        return token;
      })
      .finally(() => inflight.delete(shop));
    inflight.set(shop, next);
    return next;
  }

  return {
    getToken,
    invalidate: (shop) => {
      cache.delete(shop.trim().toLowerCase());
    },
  };
}
