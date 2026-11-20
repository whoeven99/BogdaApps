/**
 * remix-serve 会覆盖 global.fetch；libsql 传入 Request 时会变成 Invalid URL。
 * 把 Request 拆成 URL 字符串再请求。
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
