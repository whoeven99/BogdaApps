export function resolveScenarioFromOfferMode(offerMode) {
  if (offerMode === "paid") return "insufficient_paid";
  return offerMode === "trial" ? "insufficient_trial" : "insufficient_pricing";
}

export function resolveImageTranslateConfirmState(args) {
  const requiredCredits = args.count * args.creditsPerImage;
  const remaining = args.remainingCredits;
  if (remaining == null) {
    return {
      scenario: "ready",
      canStartPartial: false,
      affordableCount: args.count,
      requiredCredits,
    };
  }
  const affordableCount = Math.floor(remaining / args.creditsPerImage);
  if (remaining >= requiredCredits) {
    return {
      scenario: "ready",
      canStartPartial: false,
      affordableCount: args.count,
      requiredCredits,
    };
  }
  if (affordableCount >= 1) {
    return {
      scenario: "insufficient_paid",
      canStartPartial: true,
      affordableCount,
      requiredCredits,
    };
  }
  return {
    scenario: resolveScenarioFromOfferMode(args.quotaOfferMode),
    canStartPartial: false,
    affordableCount: 0,
    requiredCredits,
  };
}

export function shouldBlockSingleImageTranslate(remainingCredits, creditsPerImage) {
  if (remainingCredits == null) return false;
  return remainingCredits < creditsPerImage;
}
