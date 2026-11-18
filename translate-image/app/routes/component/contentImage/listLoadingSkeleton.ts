import type { ContentImageRow } from "./contentImageClient";

export const LIST_SKELETON_ROW_COUNT = 10;
export const SKELETON_ID_PREFIX = "__ciwi_skeleton__";

export function isListSkeletonId(id: string): boolean {
  return id.startsWith(SKELETON_ID_PREFIX);
}

export function skeletonResourceRows(count = LIST_SKELETON_ROW_COUNT) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    title: "",
    status: "",
    imageUrl: null as string | null,
  }));
}

export function skeletonContentImageRows(count = LIST_SKELETON_ROW_COUNT): ContentImageRow[] {
  return Array.from({ length: count }, (_, i) => ({
    urlKey: `${SKELETON_ID_PREFIX}${i}`,
    imageUrl: "",
    usedIn: [],
    translated: null,
  }));
}

export function skeletonSwitcherPageRows(count = LIST_SKELETON_ROW_COUNT) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    title: "",
    imageUrl: null as string | null,
    translated: 0,
    total: 0,
  }));
}
