import { formatThemeImageUsedIn, type ThemeImageUsedIn } from "~/lib/themeImageUsedIn";
import { parseThemeJsonContent, type ThemeImageLocation } from "./themeImageRefs";

export type ThemeSectionSchema = {
  type: string;
  name: string;
  settings: Record<string, string>;
  blocks: Record<string, { name: string; settings: Record<string, string> }>;
};

const SCHEMA_BLOCK = /{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/i;

export function extractLiquidSchemaJson(source: string): unknown | null {
  const match = SCHEMA_BLOCK.exec(source);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function lookupPath(tree: unknown, path: string): unknown {
  let current = tree;
  for (const part of path.split(".").filter(Boolean)) {
    if (!isPlainObject(current)) return undefined;
    current = current[part];
  }
  return current;
}

export function resolveThemeSchemaText(
  raw: string,
  locales: Array<Record<string, unknown>>,
): string {
  const text = raw.trim();
  if (!text.startsWith("t:")) return text;
  const path = text.slice(2);
  for (const locale of locales) {
    const value = lookupPath(locale, path);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return text;
}

function settingLabels(
  settings: unknown,
  locales: Array<Record<string, unknown>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(settings)) return out;
  for (const item of settings) {
    if (!isPlainObject(item) || typeof item.id !== "string") continue;
    if (typeof item.label === "string" && item.label.trim()) {
      out[item.id] = resolveThemeSchemaText(item.label, locales);
    }
  }
  return out;
}

export function parseSectionSchemaFile(
  filename: string,
  source: string,
  locales: Array<Record<string, unknown>> = [],
): ThemeSectionSchema | null {
  const base = filename.replace(/^\/+/, "").split("/").pop() ?? "";
  if (!base.toLowerCase().endsWith(".liquid")) return null;
  const type = base.replace(/\.liquid$/i, "");
  const json = extractLiquidSchemaJson(source);
  if (!isPlainObject(json)) return null;
  const blocks: ThemeSectionSchema["blocks"] = {};
  if (Array.isArray(json.blocks)) {
    for (const block of json.blocks) {
      if (!isPlainObject(block) || typeof block.type !== "string") continue;
      blocks[block.type] = {
        name: typeof block.name === "string" ? resolveThemeSchemaText(block.name, locales) : block.type,
        settings: settingLabels(block.settings, locales),
      };
    }
  }
  return {
    type,
    name: typeof json.name === "string" ? resolveThemeSchemaText(json.name, locales) : type,
    settings: settingLabels(json.settings, locales),
    blocks,
  };
}

export function parseSettingsSchemaFile(
  source: string,
  locales: Array<Record<string, unknown>> = [],
): Record<string, string> {
  let parsed: unknown;
  try {
    parsed = parseThemeJsonContent(source);
  } catch {
    return {};
  }
  const groups = Array.isArray(parsed) ? parsed : [];
  const out: Record<string, string> = {};
  for (const group of groups) {
    if (!isPlainObject(group)) continue;
    Object.assign(out, settingLabels(group.settings, locales));
  }
  return out;
}

function schemaForType(
  sectionType: string,
  schemas: Map<string, ThemeSectionSchema>,
): { name: string; settings: Record<string, string> } | null {
  const direct = schemas.get(sectionType);
  if (direct) return direct;
  for (const entry of schemas.values()) {
    const block = entry.blocks[sectionType];
    if (block) return block;
  }
  return null;
}

export function decorateThemeLocation(
  loc: ThemeImageLocation,
  args: {
    schemas: Map<string, ThemeSectionSchema>;
    settingLabels: Record<string, string>;
    locale?: string | null;
  },
): ThemeImageUsedIn {
  const schema = schemaForType(loc.sectionType, args.schemas);
  const sectionLabel = loc.instanceName || schema?.name || "";
  const fieldLabel =
    (loc.pageKey === "settings" ? args.settingLabels[loc.field] : undefined) ||
    schema?.settings[loc.field] ||
    args.settingLabels[loc.field] ||
    "";
  const used: ThemeImageUsedIn = {
    id: loc.id,
    title: "",
    pageKey: loc.pageKey,
    sectionType: loc.sectionType,
    field: loc.field,
  };
  if (sectionLabel) used.sectionLabel = sectionLabel;
  if (fieldLabel) used.fieldLabel = fieldLabel;
  used.title = formatThemeImageUsedIn(used, args.locale);
  return used;
}
