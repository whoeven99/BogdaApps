/**
 * Files 未分类差集：Files − 主题 − 集合。无内容图索引时不扣商品 / 文章 / 页面。
 * 与 app/server/contentImage/leftoverImages.server.ts 同口径。
 */
import { isCiwiTranslatedImageFilename } from "./pictureUrlKey.mjs";

export function leftoverUrlKeys(fileKeys, live) {
  const theme = Array.isArray(live?.theme) ? live.theme : [];
  const collection = Array.isArray(live?.collection) ? live.collection : [];
  const subtract = new Set([...theme, ...collection]);
  return (fileKeys ?? []).filter((key) => Boolean(key) && !subtract.has(key));
}

export function isLeftoverFileKey(key, live) {
  const trimmed = String(key ?? "").trim();
  if (!trimmed || isCiwiTranslatedImageFilename(trimmed)) return false;
  return leftoverUrlKeys([trimmed], live).includes(trimmed);
}
