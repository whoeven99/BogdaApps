import {
  resolveScenarioFromOfferMode,
  type CreateTaskConfirmScenario,
  type CreateTaskQuotaOfferMode,
} from "~/routes/app.translate-v4/components/CreditsConfirmPanel";

/** 图片译：不按文本建任务的 15K 门槛；能付至少一张模型价即可启动（见 contentImageJobs checkCreateAllowed）。 */

export function shouldBlockSingleImageTranslate(
  remainingCredits: number | null,
  creditsPerImage: number,
): boolean {
  if (remainingCredits == null) return false;
  return remainingCredits < creditsPerImage;
}

export function resolveImageTranslateConfirmState(args: {
  count: number;
  creditsPerImage: number;
  remainingCredits: number | null;
  quotaOfferMode: CreateTaskQuotaOfferMode;
}): {
  scenario: CreateTaskConfirmScenario;
  canStartPartial: boolean;
  affordableCount: number;
  requiredCredits: number;
} {
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
