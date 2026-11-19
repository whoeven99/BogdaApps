export const OPEN_CREDITS_PURCHASE_MODAL_EVENT = "img:open-credits-purchase-modal";

export type CreditsPurchaseModalContext = Record<string, unknown>;

export function openCreditsPurchaseModal(_context?: CreditsPurchaseModalContext) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_CREDITS_PURCHASE_MODAL_EVENT));
}
