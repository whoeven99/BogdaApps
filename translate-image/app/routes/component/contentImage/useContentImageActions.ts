import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DeleteProductImageData,
  TranslateImage,
  UploadProductImage,
} from "~/api/pictureClient";
import { showImageTranslateError } from "~/lib/imageTranslateFeedback";
import { contentImageId, imageRowKey, type ContentImageRow } from "./contentImageClient";

/** 单张翻译 / 手动替换 / 清除；成功后回调 `onChanged` 刷新列表。 */
export function useContentImageActions(args: {
  shop: string;
  languageCode: string;
  onChanged: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [busyKeys, setBusyKeys] = useState<string[]>([]);
  const { shop, languageCode, onChanged } = args;

  const withBusy = useCallback(
    async (key: string, run: () => Promise<boolean>): Promise<boolean> => {
      setBusyKeys((k) => [...k, key]);
      try {
        const ok = await run();
        if (ok) await onChanged();
        return ok;
      } finally {
        setBusyKeys((k) => k.filter((x) => x !== key));
      }
    },
    [onChanged],
  );

  const rowImageId = (row: ContentImageRow) => row.productId || contentImageId(row.urlKey);

  const translateOne = useCallback(
    (row: ContentImageRow, model: string) =>
      withBusy(imageRowKey(row), async () => {
        const res = await TranslateImage({
          imageId: rowImageId(row),
          imageUrl: row.imageUrl,
          languageCode,
          model,
        });
        if (!res?.success) {
          showImageTranslateError(res?.errorMsg, t);
          return false;
        }
        shopify.toast.show(t("contentImage.translateDone"));
        return true;
      }),
    [languageCode, t, withBusy],
  );

  const replace = useCallback(
    (row: ContentImageRow, file: File) =>
      withBusy(imageRowKey(row), async () => {
        const res = await UploadProductImage({
          shopName: shop,
          productId: rowImageId(row),
          imageUrl: row.imageUrl,
          languageCode,
          file,
        });
        if (!res?.success) {
          showImageTranslateError(res?.errorMsg, t);
          return false;
        }
        shopify.toast.show(t("Upload Success"));
        return true;
      }),
    [languageCode, shop, t, withBusy],
  );

  const clearRequest = useCallback(
    async (row: ContentImageRow): Promise<boolean> => {
      if (!row.translated) return false;
      const res = await DeleteProductImageData({
        shopName: shop,
        productId: row.translated.imageId,
        imageUrl: row.translated.imageBeforeUrl,
        languageCode,
      });
      return Boolean(res?.success);
    },
    [languageCode, shop],
  );

  const clear = useCallback(
    (row: ContentImageRow) =>
      withBusy(imageRowKey(row), async () => {
        const ok = await clearRequest(row);
        shopify.toast.show(t(ok ? "contentImage.cleared" : "contentImage.clearFailed"), { isError: !ok });
        return ok;
      }),
    [clearRequest, t, withBusy],
  );

  const clearMany = useCallback(
    async (rows: ContentImageRow[]) => {
      const keys = rows.map((r) => imageRowKey(r));
      setBusyKeys((k) => [...k, ...keys]);
      let failed = 0;
      try {
        for (const row of rows) {
          if (!(await clearRequest(row))) failed += 1;
        }
      } finally {
        setBusyKeys((k) => k.filter((x) => !keys.includes(x)));
      }
      shopify.toast.show(
        failed
          ? t("contentImage.clearManyPartial", { failed, count: rows.length })
          : t("contentImage.clearedMany", { count: rows.length }),
        { isError: failed > 0 },
      );
      onChanged();
    },
    [clearRequest, onChanged, t],
  );

  return { busyKeys, translateOne, replace, clear, clearMany };
}
