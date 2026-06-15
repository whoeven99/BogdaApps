export type OfferMetafieldSyncTrigger =
  | "loader"
  | "toggle-offer-status"
  | "create-offer"
  | "update-offer"
  | "delete-offer";

export type OfferMetafieldSyncPhase =
  | "start"
  | "db-loaded"
  | "compact-payload-built"
  | "storefront-built"
  | "shop-id-resolved"
  | "shop-metafields-ok"
  | "shop-metafields-failed"
  | "discount-metafields-ok"
  | "discount-metafields-failed"
  | "complete"
  | "failed"
  | "timed-out";

export type OfferMetafieldSyncContext = {
  trigger: OfferMetafieldSyncTrigger;
  offerId?: string;
};

const LOG_PREFIX = "[offers-sync][metafield]";

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name;
  }
  return String(error);
}

export function logOfferMetafieldSyncPhase(
  phase: OfferMetafieldSyncPhase,
  shopName: string,
  context: OfferMetafieldSyncContext,
  details: Record<string, unknown> = {},
): void {
  console.log(LOG_PREFIX, {
    phase,
    shopName,
    trigger: context.trigger,
    offerId: context.offerId ?? null,
    ...details,
  });
}

export function logOfferMetafieldSyncFailure(
  shopName: string,
  context: OfferMetafieldSyncContext,
  step: string,
  error: unknown,
  details: Record<string, unknown> = {},
): void {
  console.error(LOG_PREFIX, {
    phase: "failed",
    shopName,
    trigger: context.trigger,
    offerId: context.offerId ?? null,
    step,
    error: formatError(error),
    ...details,
  });
}
