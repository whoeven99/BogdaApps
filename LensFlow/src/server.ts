import { createServer } from "node:http";

import {
  createOrUpdateLensRule,
  diagnoseLensVisibility,
  getProductLensOptions,
  getProductHealth,
  listLensRules,
  previewLensRules,
} from "./api/lensApi.js";
import { InMemoryLensRepository } from "./repositories/inMemoryLensRepository.js";

const repository = new InMemoryLensRepository();

function sendJson(
  response: import("node:http").ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function parseBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost:3000");

  if (request.method === "GET" && url.pathname === "/api/admin/lens-rules") {
    const productId = url.searchParams.get("productId") ?? undefined;
    const result = listLensRules(repository, productId);
    sendJson(response, result.status, result.body);
    return;
  }

  if (
    request.method === "GET" &&
    url.pathname.startsWith("/api/products/") &&
    url.pathname.endsWith("/lens-options")
  ) {
    const parts = url.pathname.split("/");
    const productId = parts[3] ?? "";
    const prescriptionType = url.searchParams.get("prescriptionType") ?? undefined;
    const tags = url.searchParams.getAll("tag");
    const result = getProductLensOptions(repository, {
      productId,
      prescriptionType:
        prescriptionType === null
          ? undefined
          : (prescriptionType as Parameters<typeof getProductLensOptions>[1]["prescriptionType"]),
      tags: tags.length > 0 ? tags : undefined,
    });
    sendJson(response, result.status, result.body);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/admin/lens-rules") {
    const body = (await parseBody(request)) as {
      productId: string;
      rule: Parameters<typeof createOrUpdateLensRule>[1]["rule"];
    };

    const result = createOrUpdateLensRule(repository, body);
    sendJson(response, result.status, result.body);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/admin/lens-rules/preview") {
    const body = (await parseBody(request)) as Parameters<typeof previewLensRules>[1];
    const result = previewLensRules(repository, body);
    sendJson(response, result.status, result.body);
    return;
  }

  if (
    request.method === "POST" &&
    url.pathname === "/api/admin/diagnostics/lens-visibility"
  ) {
    const body = (await parseBody(request)) as Parameters<
      typeof diagnoseLensVisibility
    >[1];
    const result = diagnoseLensVisibility(repository, body);
    sendJson(response, result.status, result.body);
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/admin/health/products/")) {
    const productId = url.pathname.split("/").pop() ?? "";
    const result = getProductHealth(repository, productId);
    sendJson(response, result.status, result.body);
    return;
  }

  sendJson(response, 404, {
    error: "未匹配到路由",
  });
});

const port = Number(process.env.PORT ?? "3000");

server.listen(port, () => {
  console.log(`Lens API server listening on http://localhost:${port}`);
});
