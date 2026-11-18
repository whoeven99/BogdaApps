export type ThemeImageLocation = {
  id: string;
  pageKey: string;
  sectionType: string;
  field: string;
  instanceName?: string;
};

export type ThemeImageHit = {
  ref: string;
  filename: string | null;
  mediaGid: string | null;
  locations: ThemeImageLocation[];
};

const SHOP_IMAGES_PREFIX = "shopify://shop_images/";
const MEDIA_GID_PREFIX = "gid://shopify/MediaImage/";

export function isThemeImagePickerValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.startsWith(SHOP_IMAGES_PREFIX) || trimmed.startsWith(MEDIA_GID_PREFIX);
}

export function themePageKeyFromFilename(themeFilename: string): string {
  const name = themeFilename.trim().replace(/^\/+/, "");
  if (name === "config/settings_data.json") return "settings";
  const base = (name.split("/").pop() ?? name).replace(/\.json$/i, "");
  if (name.startsWith("templates/")) return base.split(".")[0] || base;
  return base;
}

export function themeLocationTitle(loc: ThemeImageLocation): string {
  return loc.sectionType
    ? `${loc.pageKey} · ${loc.sectionType} · ${loc.field}`
    : `${loc.pageKey} · ${loc.field}`;
}

function splitRef(value: string): Pick<ThemeImageHit, "ref" | "filename" | "mediaGid"> {
  const ref = value.trim();
  if (ref.startsWith(MEDIA_GID_PREFIX)) {
    return { ref, filename: null, mediaGid: ref };
  }
  const raw = ref.slice(SHOP_IMAGES_PREFIX.length).split(/[?#]/)[0] ?? "";
  let filename = raw;
  try {
    filename = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  return { ref, filename: filename || null, mediaGid: null };
}

function hitKey(hit: Pick<ThemeImageHit, "ref" | "filename" | "mediaGid">): string {
  if (hit.mediaGid) return `gid:${hit.mediaGid}`;
  if (hit.filename) return `file:${hit.filename}`;
  return `ref:${hit.ref}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readableInstanceName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const name = value.trim();
  if (!name || name.startsWith("t:")) return undefined;
  return name;
}

function walkThemeJson(args: {
  node: unknown;
  themeFilename: string;
  pageKey: string;
  path: string[];
  sectionType: string;
  instanceName?: string;
  into: Map<string, ThemeImageHit>;
}): void {
  if (Array.isArray(args.node)) {
    args.node.forEach((item, index) => {
      walkThemeJson({ ...args, node: item, path: [...args.path, String(index)] });
    });
    return;
  }
  if (!isPlainObject(args.node)) return;

  const sectionType =
    typeof args.node.type === "string" && args.node.type.trim()
      ? args.node.type.trim()
      : args.sectionType;
  const instanceName = readableInstanceName(args.node.name) ?? args.instanceName;

  for (const [key, value] of Object.entries(args.node)) {
    const path = [...args.path, key];
    if (isThemeImagePickerValue(value)) {
      const parsed = splitRef(value);
      const keyId = hitKey(parsed);
      const existing = args.into.get(keyId);
      const location: ThemeImageLocation = {
        id: `${args.themeFilename}#${path.join(".")}`,
        pageKey: args.pageKey,
        sectionType,
        field: key,
        instanceName,
      };
      if (existing) {
        if (!existing.locations.some((loc) => loc.id === location.id)) {
          existing.locations.push(location);
        }
        continue;
      }
      args.into.set(keyId, { ...parsed, locations: [location] });
      continue;
    }
    walkThemeJson({ ...args, node: value, path, sectionType, instanceName });
  }
}

/** Shopify 主题 JSON 常带自动生成的块注释头，不能直接 JSON.parse。 */
export function parseThemeJsonContent(content: string): unknown {
  const trimmed = content.trim().replace(/^\uFEFF/, "");
  const withoutHeader = trimmed.replace(/^\/\*[\s\S]*?\*\//, "").trim();
  return JSON.parse(withoutHeader);
}

export function parseThemeImageHits(filename: string, json: unknown): ThemeImageHit[] {
  const pageKey = themePageKeyFromFilename(filename);
  const into = new Map<string, ThemeImageHit>();
  const isSettings = filename.replace(/^\/+/, "").endsWith("config/settings_data.json");
  const root =
    isSettings && isPlainObject(json) && "current" in json ? json.current : json;
  walkThemeJson({
    node: root,
    themeFilename: filename,
    pageKey,
    path: [],
    sectionType: "",
    into,
  });
  return [...into.values()];
}

export function mergeThemeImageHits(hits: ThemeImageHit[]): ThemeImageHit[] {
  const into = new Map<string, ThemeImageHit>();
  for (const hit of hits) {
    const key = hitKey(hit);
    const existing = into.get(key);
    if (!existing) {
      into.set(key, { ...hit, locations: [...hit.locations] });
      continue;
    }
    for (const loc of hit.locations) {
      if (!existing.locations.some((item) => item.id === loc.id)) {
        existing.locations.push(loc);
      }
    }
  }
  return [...into.values()];
}
