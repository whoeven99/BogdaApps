import type { LoaderFunctionArgs } from "@remix-run/node";

/** Unauthenticated liveness for Render keepalive pings. */
export const loader = async (_args: LoaderFunctionArgs) => {
  return new Response("ok", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
