import { resolveShopLocale } from "~/lib/shopLocale";

export function resolvePictureReadLanguage(
  raw: string,
  shopLocales: readonly string[],
): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return trimmed;
  return resolveShopLocale(trimmed, shopLocales) ?? trimmed;
}
