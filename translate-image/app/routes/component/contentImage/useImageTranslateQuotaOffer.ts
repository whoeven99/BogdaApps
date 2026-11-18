import { useMemo } from "react";
import { useSelector } from "react-redux";
import type { CreateTaskQuotaOfferMode } from "~/routes/app.translate-v4/components/CreditsConfirmPanel";
import type { RootState } from "~/store";

/** 与 translate-v4 建任务确认弹窗相同的 trial / pricing / paid 分流。 */
export function useImageTranslateQuotaOffer(): {
  quotaOfferMode: CreateTaskQuotaOfferMode;
  hasPaidPlan: boolean;
  isNew: boolean | null;
  planType: string | null;
} {
  const plan = useSelector((state: RootState) => state.userConfig.plan);
  const isNew = useSelector((state: RootState) => state.userConfig.isNew);
  const planType = plan?.type?.trim() || null;
  return useMemo(() => {
    const normalizedPlanType = planType?.toLowerCase() || "";
    const hasPaidPlan =
      normalizedPlanType !== "" && normalizedPlanType !== "free";
    const quotaOfferMode: CreateTaskQuotaOfferMode = hasPaidPlan
      ? "paid"
      : isNew === true
        ? "trial"
        : "pricing";
    return { quotaOfferMode, hasPaidPlan, isNew, planType };
  }, [isNew, planType]);
}
