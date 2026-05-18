import {
  getBxgyDisplayMeta,
  resolveBxgyDisplaySubtitle,
  resolveBxgyDisplayTitle,
} from "../../../utils/offerParsing";

type BxgyConditionLike = {
  buyQuantity?: unknown;
  getQuantity?: unknown;
};

type BxgyPresentationLike = {
  title?: unknown;
  subtitle?: unknown;
  badge?: unknown;
};

export type BuilderBxgyDisplay = {
  title: string;
  subtitle: string;
  summary: string;
  price: string;
  saveLabel: string;
  badge: string;
};

export function resolveBuilderBxgyDisplay(
  condition: BxgyConditionLike,
  presentation?: BxgyPresentationLike,
): BuilderBxgyDisplay {
  const meta = getBxgyDisplayMeta(condition);
  const title = resolveBxgyDisplayTitle(condition, presentation?.title);
  const subtitle = resolveBxgyDisplaySubtitle(presentation?.subtitle);

  return {
    title,
    subtitle,
    summary: meta.summary,
    price: meta.price,
    saveLabel: meta.saveLabel,
    badge: String(presentation?.badge ?? "").trim(),
  };
}
