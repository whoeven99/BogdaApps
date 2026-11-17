/** React Router 内部用于 index route / fetcher 的路由参数，不应出现在用户可见 URL 中 */
const INTERNAL_SEARCH_PARAM_KEYS = ["index", "_routes"] as const;

export function stripInternalSearchParams(
  input: URLSearchParams | string,
): URLSearchParams {
  const raw =
    typeof input === "string"
      ? input.startsWith("?")
        ? input.slice(1)
        : input
      : input.toString();
  const params = new URLSearchParams(raw);
  for (const key of INTERNAL_SEARCH_PARAM_KEYS) {
    params.delete(key);
  }
  return params;
}

export function buildAppSearchString(input: URLSearchParams | string): string {
  const qs = stripInternalSearchParams(input).toString();
  return qs ? `?${qs}` : "";
}

/** POST 到 `/` 的 index action：保留 shop/host，并带上 `?index`（不用于地址栏展示）。 */
export function buildIndexActionPath(
  input: URLSearchParams | string,
  pathname = "/",
): string {
  const params = stripInternalSearchParams(input);
  params.set("index", "");
  return `${pathname}?${params.toString()}`;
}

export function hasInternalSearchParams(searchParams: URLSearchParams): boolean {
  return INTERNAL_SEARCH_PARAM_KEYS.some((key) => searchParams.has(key));
}
