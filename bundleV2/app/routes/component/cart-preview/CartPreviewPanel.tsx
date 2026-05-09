import type { CartSettingsRulesLike, PreviewDerived } from "../../../hooks/useCartPreview";
import { usePreviewDerived, usePreviewState } from "../../../hooks/useCartPreview";
import type { CartSettingsStyles } from "../../../types/cartSettings";
import { CartPreviewFooter } from "./CartPreviewFooter";
import { CartPreviewHeader } from "./CartPreviewHeader";
import { CartPreviewItems } from "./CartPreviewItems";
import { CartPreviewPromotions } from "./CartPreviewPromotions";
import { CartPreviewTimer } from "./CartPreviewTimer";
import { CartPreviewUpsell } from "./CartPreviewUpsell";

type Props = {
  rules: CartSettingsRulesLike;
  styles: CartSettingsStyles;
};

export function CartPreviewPanel({ rules, styles }: Props) {
  const state = usePreviewState();
  const derived: PreviewDerived = usePreviewDerived(rules, state);
  const itemCount = derived.items.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
  const upsell = state.settings.upsellOverrides;
  const upsellItems = upsell?.items ?? [];
  const upsellEnabled = upsell?.enabled ?? false;

  return (
    <div
      className="rounded-[16px] border border-[#e5e7eb] overflow-hidden bg-white"
      style={{
        ["--accent" as any]: String(styles.ui.accentColor || "#7d5ce6"),
      }}
    >
      <CartPreviewHeader itemCount={itemCount} />
      {rules.modules.timer.enabled ? (
        <CartPreviewTimer
          text={derived.timerText}
          textColor={styles.ui.timerTextColor}
          backgroundColor={styles.ui.timerBackgroundColor}
        />
      ) : null}
      {derived.promotionsEnabled ? (
        <CartPreviewPromotions
          text={derived.promotionsText}
          progressPct={derived.promotionsProgressPct}
          progressColor={styles.ui.promotionsProgressColor}
          backgroundColor={styles.ui.promotionsBackgroundColor}
          radiusPx={styles.ui.promotionsRadiusPx}
        />
      ) : null}
      <CartPreviewItems items={derived.items} market={state.market} />
      <CartPreviewUpsell
        enabled={upsellEnabled}
        title={upsell?.title || "You may also like"}
        items={upsellItems}
        market={state.market}
      />
      <CartPreviewFooter
        subtotalMinor={derived.subtotalMinor}
        market={state.market}
        accentColor={styles.ui.accentColor}
      />
    </div>
  );
}
