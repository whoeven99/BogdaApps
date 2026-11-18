import { IMAGE_JOB_INSUFFICIENT_CREDITS } from "~/lib/imageJobQuota";
import { showImageTranslateError } from "~/lib/imageTranslateFeedback";
import { openCreditsPurchaseModal } from "~/utils/creditsPurchaseModal";
import { buildImageTranslateCreditsPurchaseContext } from "~/utils/creditsPurchaseTaskContext";
import { shouldBlockSingleImageTranslate } from "./imageTranslateConfirmState";

/** View 对照弹窗点翻译：余额不够则 toast + 全局补额度，够则原地译、不关弹窗。 */
export function startViewImageTranslate(args: {
  remainingCredits: number | null;
  creditsPerImage: number;
  t: (key: string, options?: Record<string, unknown>) => string;
  run: () => Promise<boolean>;
  onSpent: (credits: number) => void;
}): void {
  if (shouldBlockSingleImageTranslate(args.remainingCredits, args.creditsPerImage)) {
    showImageTranslateError(IMAGE_JOB_INSUFFICIENT_CREDITS, args.t);
    openCreditsPurchaseModal(
      buildImageTranslateCreditsPurchaseContext({
        imageCount: 1,
        estimatedCredits: args.creditsPerImage,
        currentRemainingCredits: args.remainingCredits,
      }),
    );
    return;
  }
  void args.run().then((ok) => {
    if (ok) args.onSpent(args.creditsPerImage);
  });
}
