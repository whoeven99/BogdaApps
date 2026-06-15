import { MetafieldSnapshot, OfferMetafieldPayload } from "./types";

export const LOG_PREFIX = "[ciwi-cart-lines-discount]";
export const ENABLE_FUNCTION_LOGS = false;

export function log(step: string, detail?: unknown): void {
  if (!ENABLE_FUNCTION_LOGS) return;
  try {
    if (detail === undefined) {
      console.error(`${LOG_PREFIX} ${step}`);
    } else {
      console.error(
        `${LOG_PREFIX} ${step} ${typeof detail === "string" ? detail : JSON.stringify(detail)}`,
      );
    }
  } catch {
    console.error(`${LOG_PREFIX} ${step} (log stringify failed)`);
  }
}

export function summarizeMetafield(
  mf: { jsonValue?: unknown; value?: unknown; type?: string } | null | undefined,
): {
  present: boolean;
  type: string | null;
  hasJsonValue: boolean;
  jsonValueType: string | null;
  jsonValueKeys?: string[];
  rawValueLength: number;
} {
  const jsonValue = mf?.jsonValue;
  const rawValue = typeof mf?.value === "string" ? mf.value : "";
  const jsonValueType =
    jsonValue === null
      ? "null"
      : Array.isArray(jsonValue)
        ? "array"
        : typeof jsonValue === "object"
          ? "object"
          : typeof jsonValue;

  return {
    present: Boolean(mf),
    type: mf?.type ?? null,
    hasJsonValue: jsonValue !== undefined && jsonValue !== null,
    jsonValueType: jsonValue === undefined ? null : jsonValueType,
    jsonValueKeys:
      jsonValue && typeof jsonValue === "object" && !Array.isArray(jsonValue)
        ? Object.keys(jsonValue as Record<string, unknown>).slice(0, 20)
        : undefined,
    rawValueLength: rawValue.length,
  };
}

export function logCiwiBundleOffersDiagnostics(
  discountOwnerMf: MetafieldSnapshot,
  effectiveParsedPayload: OfferMetafieldPayload | null | undefined,
  extra: {
    resolvedSource: string;
  },
): void {
  if (!ENABLE_FUNCTION_LOGS) return;
  log("ciwi_bundle_offers_resolve", {
    resolvedSource: extra.resolvedSource,
    discountOwner: {
      namespace: "$app:ciwi_bundle",
      key: "offers",
      metafield: summarizeMetafield(discountOwnerMf),
    },
    parsedOffersCount: Array.isArray(effectiveParsedPayload?.offers)
      ? effectiveParsedPayload!.offers!.length
      : null,
    parsedUpdatedAt: effectiveParsedPayload?.updatedAt ?? null,
    parsedOfferIds: Array.isArray(effectiveParsedPayload?.offers)
      ? effectiveParsedPayload!.offers!
          .map((offer) => {
            const wire = offer as { id?: string; i?: string };
            return String(wire?.id || wire?.i || "").trim();
          })
          .filter(Boolean)
          .slice(0, 10)
      : [],
  });
}
