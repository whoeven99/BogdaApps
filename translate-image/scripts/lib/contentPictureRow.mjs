export const CONTENT_IMAGE_ID_PREFIX = "content:";

export function contentImageId(urlKey) {
  return `${CONTENT_IMAGE_ID_PREFIX}${String(urlKey ?? "").trim()}`;
}

export function isContentImageId(imageId) {
  return String(imageId ?? "").startsWith(CONTENT_IMAGE_ID_PREFIX);
}

export function pickLatestContentPictureRow(rows) {
  let latest = null;
  for (const row of rows ?? []) {
    if (!row || row.isDelete) continue;
    if (!latest || Number(row.id) > Number(latest.id)) latest = row;
  }
  return latest;
}
