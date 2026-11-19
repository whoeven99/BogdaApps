/**
 * remix-serve 会覆盖 global.fetch；libsql 首次查询若拿到 Request 对象会报 Invalid URL。
 * 模块加载时捕获原生 fetch，并把 Request 转成 URL 字符串。只对只读 SQL 的 429/5xx 重试。
 */
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const MAX_RETRY_ATTEMPTS = 2;
const MUTATION_SQL_RE =
  /\b(INSERT|UPDATE|DELETE|REPLACE|ALTER|DROP|CREATE|TRUNCATE|ATTACH|DETACH|VACUUM|REINDEX|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)\b/i;
const READISH_SQL_RE = /\b(SELECT|WITH|PRAGMA|EXPLAIN)\b/i;

function retryDelayMs(attempt: number): number {
  return 100 * 2 ** attempt + Math.floor(Math.random() * 100);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isReplayableBody(body: BodyInit | null | undefined): boolean {
  if (body == null) return true;
  return (
    typeof body === "string" ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    body instanceof URLSearchParams
  );
}

function decodeBodyText(body: BodyInit | ArrayBuffer | null | undefined): string | null {
  if (body == null) return "";
  if (typeof body === "string") return body;
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
  if (ArrayBuffer.isView(body)) return new TextDecoder().decode(body as ArrayBufferView);
  if (body instanceof URLSearchParams) return body.toString();
  return null;
}

export function isRetrySafeLibsqlBody(body: BodyInit | ArrayBuffer | null | undefined): boolean {
  const text = decodeBodyText(body);
  if (text == null) return false;
  if (!text) return true;
  if (MUTATION_SQL_RE.test(text)) return false;
  return READISH_SQL_RE.test(text);
}

async function fetchWithRetry(
  baseFetch: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  retrySafe: boolean,
): Promise<Response> {
  const replayable = isReplayableBody(init?.body);
  for (let attempt = 0; ; attempt++) {
    const response = await baseFetch(input, init);
    if (!RETRYABLE_STATUS.has(response.status)) return response;
    if (!retrySafe || !replayable || attempt >= MAX_RETRY_ATTEMPTS) return response;
    try {
      await response.body?.cancel();
    } catch {
      /* ignore */
    }
    console.warn(`[Turso] HTTP ${response.status}，第 ${attempt + 1}/${MAX_RETRY_ATTEMPTS} 次重试`);
    await sleep(retryDelayMs(attempt));
  }
}

export function createLibsqlFetch(baseFetch: typeof fetch = globalThis.fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    if (input instanceof Request) {
      const body = input.body ? await input.arrayBuffer() : undefined;
      return fetchWithRetry(
        baseFetch,
        input.url,
        { method: input.method, headers: input.headers, body },
        isRetrySafeLibsqlBody(body),
      );
    }
    return fetchWithRetry(baseFetch, input, init, isRetrySafeLibsqlBody(init?.body ?? null));
  };
}

export const libsqlFetch = createLibsqlFetch();
