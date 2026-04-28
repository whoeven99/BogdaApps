import { evaluateLensRules } from "../domain/lensRuleEngine.js";
import type { LensOption, LensRule, ProductContext } from "../types/lens.js";

export type ProductLensOptionView = LensOption & {
  state: "visible" | "disabled" | "hidden";
  messages: string[];
  reasonCodes: string[];
};

export type ProductLensOptionsResult = {
  availableLensOptions: ProductLensOptionView[];
  disabledLensOptions: ProductLensOptionView[];
  hiddenLensOptions: ProductLensOptionView[];
  messages: string[];
  priceAdjustments: Array<{
    lensOptionId: string;
    amount: number;
  }>;
  reasonCodes: string[];
};

function buildOptionView(
  lensOption: LensOption,
  decision?: ReturnType<typeof evaluateLensRules>["decisions"][string],
): ProductLensOptionView {
  return {
    ...lensOption,
    state: decision?.state ?? "hidden",
    messages: decision?.messages ?? [],
    reasonCodes: decision?.reasonCodes ?? ["RULE_NOT_MATCHED"],
  };
}

export function buildProductLensOptions(
  context: ProductContext,
  rules: LensRule[],
  lensOptions: LensOption[],
): ProductLensOptionsResult {
  const evaluation = evaluateLensRules(context, rules);
  const availableLensOptions: ProductLensOptionView[] = [];
  const disabledLensOptions: ProductLensOptionView[] = [];
  const hiddenLensOptions: ProductLensOptionView[] = [];
  const messages = new Set<string>();
  const reasonCodes = new Set<string>();

  for (const lensOption of lensOptions) {
    const decision = evaluation.decisions[lensOption.id];
    const view = buildOptionView(lensOption, decision);

    for (const message of view.messages) {
      messages.add(message);
    }

    for (const reasonCode of view.reasonCodes) {
      reasonCodes.add(reasonCode);
    }

    if (view.state === "visible") {
      availableLensOptions.push(view);
    } else if (view.state === "disabled") {
      disabledLensOptions.push(view);
    } else {
      hiddenLensOptions.push(view);
    }
  }

  return {
    availableLensOptions,
    disabledLensOptions,
    hiddenLensOptions,
    messages: [...messages],
    priceAdjustments: availableLensOptions.map((option) => ({
      lensOptionId: option.id,
      amount: option.basePrice,
    })),
    reasonCodes: [...reasonCodes],
  };
}
