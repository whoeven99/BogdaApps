import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { showImageTranslateError } from "~/lib/imageTranslateFeedback";
import { IMAGE_TRANSLATE_SCOPE_MISSING } from "~/lib/imageTranslate";
import {
  createContentImageJob,
  formatJobActiveToast,
  isActiveJob,
  type ContentImageJob,
  type ContentImageRow,
  type ImageTranslateJobKind,
} from "./contentImageClient";

/** 确认弹窗的打开 / 提交：1 张默认同步单译，多张或 `{ asJob: true }` 建后台任务。 */
export function useBatchTranslate(args: {
  job: ContentImageJob | null;
  kind?: ImageTranslateJobKind;
  canWriteFiles: boolean;
  language: string;
  model: string;
  creditsPerImage: number;
  translateOne: (row: ContentImageRow, model: string) => Promise<boolean>;
  onJobCreated: (job: ContentImageJob | null) => void;
  onSpent: (credits: number) => void;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ContentImageRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const asJobRef = useRef(false);

  const open = useCallback(
    (selected: ContentImageRow[], options?: { asJob?: boolean }) => {
      if (selected.length === 0) return;
      if (!args.canWriteFiles) {
        showImageTranslateError(IMAGE_TRANSLATE_SCOPE_MISSING, t);
        return;
      }
      const asJob = Boolean(options?.asJob) || selected.length > 1;
      if (asJob && isActiveJob(args.job)) {
        shopify.toast.show(formatJobActiveToast(t, args.job?.kind, args.kind), { isError: true });
        return;
      }
      asJobRef.current = asJob;
      setRows(selected);
    },
    [args.canWriteFiles, args.job, args.kind, t],
  );

  const close = useCallback(() => setRows([]), []);

  const submitJob = async (retranslate: boolean) => {
    const res = await createContentImageJob({
      targetLanguage: args.language,
      model: args.model,
      kind: args.kind,
      items: rows.map((r) => ({
        imageUrl: r.imageUrl,
        title: r.usedIn[0]?.title,
        productId: r.productId,
      })),
      retranslate,
    });
    if (!res.success) {
      if (res.errorMsg === "JOB_ACTIVE") {
        shopify.toast.show(formatJobActiveToast(t, args.job?.kind, args.kind), { isError: true });
      }
      else showImageTranslateError(res.errorMsg, t);
      return;
    }
    shopify.toast.show(t("contentImage.job.created"));
    args.onJobCreated(res.response);
  };

  const confirm = async (retranslate: boolean) => {
    const selected = rows;
    if (selected.length === 1 && !asJobRef.current) {
      setRows([]);
      if (await args.translateOne(selected[0], args.model)) args.onSpent(args.creditsPerImage);
      return;
    }
    setSubmitting(true);
    try {
      await submitJob(retranslate);
      setRows([]);
    } finally {
      setSubmitting(false);
    }
  };

  return { rows, submitting, open, close, confirm };
}
