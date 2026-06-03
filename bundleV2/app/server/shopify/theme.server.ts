import { sanitizeEnvLikeValue } from "../../utils/env";
import { BUNDLE_THEME_PRODUCT_PLUGIN } from "../../utils/themePlugins";

export type ThemeEditorTarget = {
  id: string;
  editorId: string;
  name: string;
  role: string;
};

type ThemeExtensionDebugEntry = {
  fileName?: string;
  entryKey: string | null;
  blockType: string;
  disabled?: boolean;
  hasSettings: boolean;
};

type ThemeExtensionMatchedEntry = ThemeExtensionDebugEntry & {
  matchedByApp: boolean;
  matchedByUid: boolean;
  matchedByHandleOnly: boolean;
  enabled: boolean;
};

type ThemeExtensionThemeDebug = {
  id: string;
  name: string;
  role: string;
  hasSettingsData: boolean;
  parseOk?: boolean;
  totalBlockEntries?: number;
  appRelatedEntries?: ThemeExtensionDebugEntry[];
  matchedEntries?: ThemeExtensionMatchedEntry[];
  result?: string;
};

export type ThemeExtensionDetectionDebug = {
  pluginKey: string;
  extensionHandle: string;
  extensionUid: string;
  embedHandle: string;
  appClientId: string;
  appName: string;
  appNameSlug: string;
  enabled: boolean;
  scannedThemeCount: number;
  scannedBlockCount: number;
  themes: ThemeExtensionThemeDebug[];
  matchedTheme?: {
    id: string;
    name: string;
    role: string;
    entryKey: string | null;
    blockType: string;
  };
  error?: string;
};

type ThemeBlockEntry = {
  block: Record<string, unknown>;
  fileName: string;
  entryKey: string | null;
};

type AdminType = {
  graphql: (query: string) => Promise<{ json: () => Promise<unknown> }>;
};

function collectThemeBlockEntries(
  node: unknown,
  out: ThemeBlockEntry[],
  fileName: string,
  entryKey: string | null = null,
): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectThemeBlockEntries(item, out, fileName, entryKey);
    return;
  }
  const rec = node as Record<string, unknown>;
  if (typeof rec.type === "string" || entryKey) {
    out.push({ block: rec, fileName, entryKey });
  }
  for (const [key, value] of Object.entries(rec)) {
    collectThemeBlockEntries(value, out, fileName, key);
  }
}

function normalizeThemeJsonFileContent(content: string): string {
  return String(content || "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

async function getThemeExtensionEnabledAcrossThemes(
  admin: AdminType,
  pluginKey: string,
  extensionHandle: string,
  blockHandles: string[],
  extensionUid: string,
  appClientId: string,
  appName?: string,
): Promise<{ enabled: boolean; debug: ThemeExtensionDetectionDebug }> {
  const debug: ThemeExtensionDetectionDebug = {
    pluginKey,
    extensionHandle,
    extensionUid,
    embedHandle: blockHandles[0] || "",
    appClientId,
    appName: String(appName || ""),
    appNameSlug: "",
    enabled: false,
    scannedThemeCount: 0,
    scannedBlockCount: 0,
    themes: [],
  };

  try {
    const response = await admin.graphql(
      `#graphql
        query ThemeSettingsDataAcrossThemes {
          themes(first: 20) {
            edges {
              node {
                id name role
                files(
                  filenames: [
                    "config/settings_data.json"
                    "templates/*.json"
                    "sections/*.json"
                    "section_groups/*.json"
                  ]
                  first: 250
                ) {
                  nodes {
                    ... on OnlineStoreThemeFile {
                      filename
                      body {
                        ... on OnlineStoreThemeFileBodyText { content }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
    );
    const json = (await response.json()) as {
      data?: { themes?: { edges?: Array<{ node?: Record<string, unknown> }> } };
      errors?: Array<{ message?: string }>;
    };

    const graphqlErrors = Array.isArray(json?.errors) ? json.errors : [];
    const themeNodes =
      json?.data?.themes?.edges
        ?.map((edge) => edge?.node)
        .filter(Boolean) ?? [];

    if (graphqlErrors.length > 0) {
      debug.error = graphqlErrors
        .map((item) => String(item?.message || "").trim())
        .filter(Boolean)
        .join(" | ");
      console.error("[theme-extension] graphql errors while scanning themes", {
        errors: graphqlErrors,
        recoveredThemeCount: themeNodes.length,
      });
      if (themeNodes.length === 0) return { enabled: false, debug };
    }

    debug.scannedThemeCount = themeNodes.length;

    const normalizedBlockHandles = Array.from(
      new Set(blockHandles.map((h) => String(h || "").trim()).filter(Boolean)),
    );

    console.error("[theme-extension] scanning themes", {
      pluginKey,
      extensionHandle,
      blockHandles: normalizedBlockHandles,
      extensionUid,
      appClientId,
      appName,
      themeCount: themeNodes.length,
    });

    const handleKebabs = normalizedBlockHandles.map((h) => h.replace(/_/g, "-"));
    const embedHandleCandidates = [
      ...normalizedBlockHandles.map((h) => `${appClientId}/${h}`),
      ...handleKebabs.map((h) => `${appClientId}/${h}`),
    ].filter(Boolean);
    const blockPathSegments = [
      ...normalizedBlockHandles.map((h) => `/blocks/${h}/`),
      ...handleKebabs.map((h) => `/blocks/${h}/`),
    ];
    const embedUidSegments = [
      extensionUid ? `/blocks/app-embed/${extensionUid}` : "",
      ...normalizedBlockHandles.map((h) => (extensionUid ? `/blocks/${h}/${extensionUid}` : "")),
      ...handleKebabs.map((h) => (extensionUid ? `/blocks/${h}/${extensionUid}` : "")),
    ].filter(Boolean);

    const appNameSlug = String(appName || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    debug.appNameSlug = appNameSlug;

    const isOurAppBlock = (blockType: string) => {
      if (!appClientId && !extensionHandle) return false;
      if (appClientId && blockType.includes(`/apps/${appClientId}/`)) return true;
      if (extensionHandle && blockType.includes(`/apps/${extensionHandle}/`)) return true;
      if (appNameSlug && blockType.includes(`/apps/${appNameSlug}/`)) return true;
      return false;
    };

    const hasEditorEmbedHandle = (value: string | null | undefined) => {
      if (!value) return false;
      return embedHandleCandidates.some((c) => value.includes(c));
    };

    const matchesEmbedFromEditorUrl = (blockType: string, entryKey: string | null) => {
      if (hasEditorEmbedHandle(entryKey)) return true;
      if (!appClientId) return false;
      if (
        normalizedBlockHandles.some((h) => blockType.includes(`/apps/${appClientId}/${h}/`)) ||
        handleKebabs.some((h) => blockType.includes(`/apps/${appClientId}/${h}/`))
      ) return true;
      if (embedUidSegments.some((seg) => blockType.includes(seg))) return true;
      return blockPathSegments.some((seg) => blockType.includes(seg));
    };

    const isLikelyThemeEmbedBlock = (block: Record<string, unknown>) =>
      "disabled" in block || "settings" in block;

    let scannedBlockCount = 0;

    for (const theme of themeNodes) {
      const themeRecord = theme as Record<string, unknown>;
      const themeFiles = Array.isArray((themeRecord?.files as { nodes?: unknown })?.nodes)
        ? ((themeRecord.files as { nodes: unknown[] }).nodes)
        : [];

      const jsonFiles = (themeFiles as Array<{ filename?: unknown; body?: { content?: unknown } }>)
        .map((node) => ({
          fileName: String(node?.filename || "").trim(),
          content: node?.body?.content,
        }))
        .filter(
          (file) =>
            Boolean(file.fileName) &&
            file.fileName.endsWith(".json") &&
            typeof file.content === "string" &&
            (file.content as string).trim() !== "",
        ) as Array<{ fileName: string; content: string }>;

      const themeDebug: ThemeExtensionThemeDebug = {
        id: String(themeRecord?.id || ""),
        name: String(themeRecord?.name || ""),
        role: String(themeRecord?.role || ""),
        hasSettingsData: jsonFiles.some((f) => f.fileName === "config/settings_data.json"),
        matchedEntries: [],
      };
      debug.themes.push(themeDebug);

      if (!jsonFiles.length) {
        themeDebug.result = "missing-theme-json-files";
        continue;
      }

      const blockEntries: ThemeBlockEntry[] = [];
      let parsedFileCount = 0;
      let parseFailedCount = 0;

      for (const file of jsonFiles) {
        try {
          const parsed: unknown = JSON.parse(normalizeThemeJsonFileContent(file.content));
          parsedFileCount += 1;
          collectThemeBlockEntries(parsed, blockEntries, file.fileName);
        } catch (error) {
          parseFailedCount += 1;
          console.error("[theme-extension] failed to parse theme json file", {
            themeId: themeRecord?.id,
            fileName: file.fileName,
            error,
          });
        }
      }

      themeDebug.parseOk = parsedFileCount > 0 && parseFailedCount === 0;
      if (parsedFileCount === 0) {
        themeDebug.result = "parse-failed";
        continue;
      }

      scannedBlockCount += blockEntries.length;
      debug.scannedBlockCount = scannedBlockCount;
      themeDebug.totalBlockEntries = blockEntries.length;

      const appRelatedEntries = blockEntries
        .filter(({ block, entryKey }) => {
          const blockType = String(block?.type || "");
          return (
            Boolean(entryKey && String(entryKey).includes("/")) ||
            blockType.includes("shopify://apps/") ||
            blockType.includes("/apps/") ||
            blockType.includes("/blocks/")
          );
        })
        .slice(0, 12)
        .map(({ block, entryKey, fileName }) => ({
          fileName,
          entryKey,
          blockType: String(block?.type || ""),
          disabled: block?.disabled,
          hasSettings: "settings" in block,
        }));
      themeDebug.appRelatedEntries = appRelatedEntries as ThemeExtensionDebugEntry[];

      for (const { block, entryKey, fileName } of blockEntries) {
        const blockType = String(block?.type || "");
        if (!matchesEmbedFromEditorUrl(blockType, entryKey)) continue;

        const matchedByApp = hasEditorEmbedHandle(entryKey) || isOurAppBlock(blockType);
        const matchedByUid = Boolean(
          extensionUid && embedUidSegments.some((seg) => blockType.includes(seg)),
        );
        const matchedByHandleOnly = !matchedByApp && !matchedByUid && isLikelyThemeEmbedBlock(block);
        const enabled = block?.disabled !== true;

        themeDebug.matchedEntries?.push({
          fileName,
          entryKey,
          blockType,
          disabled: block?.disabled as boolean | undefined,
          hasSettings: "settings" in block,
          matchedByApp,
          matchedByUid,
          matchedByHandleOnly,
          enabled,
        });

        if (enabled && (matchedByApp || matchedByUid || matchedByHandleOnly)) {
          themeDebug.result = "enabled-match";
          debug.enabled = true;
          debug.matchedTheme = {
            id: String(themeRecord?.id || ""),
            name: String(themeRecord?.name || ""),
            role: String(themeRecord?.role || ""),
            entryKey,
            blockType,
          };
          return { enabled: true, debug };
        }
      }

      themeDebug.result = themeDebug.matchedEntries?.length
        ? "matched-but-disabled"
        : "no-match-in-theme";
    }
  } catch (error) {
    debug.error = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Failed to read theme extension status", error);
  }

  return { enabled: false, debug };
}

export async function fetchThemeEditorTargets(admin: AdminType): Promise<ThemeEditorTarget[]> {
  try {
    const response = await admin.graphql(
      `#graphql
        query ThemeEditorTargets {
          themes(first: 20) {
            edges {
              node { id themeStoreId name role }
            }
          }
        }
      `,
    );
    const json = (await response.json()) as {
      data?: { themes?: { edges?: Array<{ node?: { id?: string; themeStoreId?: string; name?: string; role?: string } }> } };
    };

    const themeNodes =
      json?.data?.themes?.edges?.map((edge) => edge?.node).filter(Boolean) ?? [];

    const priorityByRole: Record<string, number> = {
      MAIN: 0,
      UNPUBLISHED: 1,
      DEVELOPMENT: 2,
      DEMO: 3,
    };

    return (themeNodes as Array<{ id?: string; themeStoreId?: string; name?: string; role?: string }>)
      .map((theme) => ({
        id: String(theme?.id || ""),
        editorId: String(theme?.themeStoreId || "").trim(),
        name: String(theme?.name || "").trim(),
        role: String(theme?.role || "").trim(),
      }))
      .filter((theme) => theme.id && theme.name)
      .sort((a, b) => {
        const ap = priorityByRole[a.role] ?? 99;
        const bp = priorityByRole[b.role] ?? 99;
        if (ap !== bp) return ap - bp;
        return a.name.localeCompare(b.name);
      });
  } catch (error) {
    console.error("[theme-extension] failed to fetch theme editor targets", error);
    return [];
  }
}

export async function getCurrentThemeExtensionEnabled(
  admin: AdminType,
): Promise<{ enabled: boolean; debug: ThemeExtensionDetectionDebug }> {
  const apiKey = sanitizeEnvLikeValue(process.env.SHOPIFY_API_KEY);
  const appDisplayName =
    sanitizeEnvLikeValue(process.env.SHOPIFY_APP_NAME) ||
    sanitizeEnvLikeValue(process.env.APP_NAME);

  try {
    return await getThemeExtensionEnabledAcrossThemes(
      admin,
      BUNDLE_THEME_PRODUCT_PLUGIN.key,
      BUNDLE_THEME_PRODUCT_PLUGIN.extensionHandle,
      BUNDLE_THEME_PRODUCT_PLUGIN.blockHandles ?? [BUNDLE_THEME_PRODUCT_PLUGIN.embedHandle],
      BUNDLE_THEME_PRODUCT_PLUGIN.extensionUid,
      apiKey,
      appDisplayName,
    );
  } catch (error) {
    console.error("Failed to check theme extension status", error);
    return {
      enabled: false,
      debug: {
        pluginKey: BUNDLE_THEME_PRODUCT_PLUGIN.key,
        extensionHandle: BUNDLE_THEME_PRODUCT_PLUGIN.extensionHandle,
        extensionUid: BUNDLE_THEME_PRODUCT_PLUGIN.extensionUid,
        embedHandle: BUNDLE_THEME_PRODUCT_PLUGIN.embedHandle,
        appClientId: apiKey,
        appName: String(appDisplayName || ""),
        appNameSlug: "",
        enabled: false,
        scannedThemeCount: 0,
        scannedBlockCount: 0,
        themes: [],
        error: error instanceof Error ? error.message : JSON.stringify(error),
      },
    };
  }
}
