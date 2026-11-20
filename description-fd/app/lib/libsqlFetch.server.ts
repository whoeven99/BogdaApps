/**
 * remix-serve 会用 @remix-run/web-fetch 覆盖 global.fetch。
 * @libsql/client 首次查询传入 Request 对象时，Remix 的 fetch 把它当成 URL 字符串，
 * 报 Invalid URL。这里拆成 url 字符串再请求。
 */
function isRequestLike(input: RequestInfo | URL): input is Request {
  return (
    typeof input === "object" &&
    input !== null &&
    "url" in input &&
    typeof (input as Request).url === "string" &&
    "method" in input
  );
}

export async function libsqlFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (isRequestLike(input)) {
    const body = input.body ? await input.arrayBuffer() : undefined;
    return fetch(input.url, {
      method: input.method,
      headers: input.headers,
      body,
    });
  }
  return fetch(input, init);
}
