import type { OfferActionErrorPayload } from "./types";

export function offerActionErrorResponse(message: string, status: number) {
  return Response.json(
    { _offerActionError: true as const, message } satisfies OfferActionErrorPayload,
    { status },
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function isMissingOfferCampaignConfigColumnError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("campaignconfigjson") &&
    (message.includes("no such column") ||
      message.includes("has no column named") ||
      message.includes("column does not exist"))
  );
}

export async function resolveSessionShopName(
  admin: { graphql: (query: string) => Promise<{ json: () => Promise<unknown> }> },
  session: { shop?: string | null },
): Promise<string> {
  const directShopName = String(session?.shop || "").trim();
  if (directShopName) return directShopName;
  const shopNameResponse = await admin.graphql(
    `#graphql
      query ShopName {
        shop { name }
      }
    `,
  );
  const shopNameJson = (await shopNameResponse.json()) as { data?: { shop?: { name?: string } } };
  return String(shopNameJson?.data?.shop?.name || "").trim();
}

export function normalizeOfferNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isTransientDbWriteError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
  const upper = String(message || "").toUpperCase();
  return (
    upper.includes("SQLITE_BUSY") ||
    upper.includes("SQLITE_LOCKED") ||
    upper.includes("DEADLOCK") ||
    upper.includes("TIMED OUT")
  );
}

export async function writeOfferWithRetry<T>(writeFn: () => Promise<T>): Promise<T> {
  try {
    return await writeFn();
  } catch (error) {
    if (!isTransientDbWriteError(error)) throw error;
    console.warn("offer write failed once, retrying...", error);
    await new Promise((resolve) => setTimeout(resolve, 150));
    return writeFn();
  }
}
