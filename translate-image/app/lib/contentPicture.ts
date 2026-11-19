export const CONTENT_IMAGE_ID_PREFIX = "content:";

export function contentImageId(urlKey: string): string {
  return `${CONTENT_IMAGE_ID_PREFIX}${String(urlKey ?? "").trim()}`;
}

export function isContentImageId(imageId: string): boolean {
  return String(imageId ?? "").startsWith(CONTENT_IMAGE_ID_PREFIX);
}

export function pickLatestContentPictureRow<T extends { id: number; isDelete?: boolean }>(
  rows: T[] | null | undefined,
): T | null {
  let latest: T | null = null;
  for (const row of rows ?? []) {
    if (!row || row.isDelete) continue;
    if (!latest || Number(row.id) > Number(latest.id)) latest = row;
  }
  return latest;
}
