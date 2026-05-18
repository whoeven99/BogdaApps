import {
  getBxgyDisplayMeta,
  resolveBxgyDisplaySubtitle,
  resolveBxgyDisplayTitle,
} from "../../../utils/offerParsing";
import type { BuilderDisplayCard } from "./displayCardContract";

type BxgyConditionLike = {
  buyQuantity?: unknown;
  getQuantity?: unknown;
};

type BxgyPresentationLike = {
  title?: unknown;
  subtitle?: unknown;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: unknown;
};

export type BuilderBxgyDisplay = BuilderDisplayCard & {
  summary: string;
  badge: string;
};

export function resolveBuilderBxgyDisplay(
  condition: BxgyConditionLike,
  presentation?: BxgyPresentationLike,
): BuilderBxgyDisplay {
  const meta = getBxgyDisplayMeta(condition);
  const title = resolveBxgyDisplayTitle(
    condition,
    presentation?.title,
    presentation?.titleSource,
  );
  const subtitle = resolveBxgyDisplaySubtitle(
    presentation?.subtitle,
    presentation?.subtitleSource,
  );

  return {
    title,
    subtitle,
    summary: meta.summary,
    price: meta.price,
    saveLabel: meta.saveLabel,
    badge: String(presentation?.badge ?? "").trim(),
  };
}
