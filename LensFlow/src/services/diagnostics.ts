import { evaluateLensRules } from "../domain/lensRuleEngine.js";
import type { LensRule, ProductContext } from "../types/lens.js";

export type LensVisibilityDiagnostic = {
  visibleLensOptionIds: string[];
  disabledLensOptionIds: string[];
  hiddenLensOptionIds: string[];
  summaryMessages: string[];
  traces: ReturnType<typeof evaluateLensRules>["traces"];
};

export function buildLensVisibilityDiagnostic(
  context: ProductContext,
  rules: LensRule[],
): LensVisibilityDiagnostic {
  const evaluation = evaluateLensRules(context, rules);
  const visibleLensOptionIds: string[] = [];
  const disabledLensOptionIds: string[] = [];
  const hiddenLensOptionIds: string[] = [];
  const summaryMessages: string[] = [];

  for (const decision of Object.values(evaluation.decisions)) {
    if (decision.state === "visible") {
      visibleLensOptionIds.push(decision.lensOptionId);
    } else if (decision.state === "disabled") {
      disabledLensOptionIds.push(decision.lensOptionId);
    } else {
      hiddenLensOptionIds.push(decision.lensOptionId);
    }

    if (decision.messages.length > 0) {
      summaryMessages.push(...decision.messages);
    }
  }

  if (summaryMessages.length === 0 && visibleLensOptionIds.length === 0) {
    summaryMessages.push("当前条件下没有可展示的镜片选项");
  }

  return {
    visibleLensOptionIds,
    disabledLensOptionIds,
    hiddenLensOptionIds,
    summaryMessages,
    traces: evaluation.traces,
  };
}
