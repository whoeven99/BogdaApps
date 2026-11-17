import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { getAccountQuota } from "~/server/billing/quota.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const quota = await getAccountQuota(session.shop);
  if (!quota) {
    return json({ success: false, errorCode: 503, errorMsg: "quota unavailable", response: null });
  }
  return json({
    success: true,
    errorCode: 0,
    errorMsg: "",
    response: {
      usedPoints: quota.usedPoints,
      purchasePoints: quota.purchasePoints,
      remaining: quota.remaining,
      plan: quota.plan,
      planType: quota.planType,
      feeType: quota.feeType,
      currentPeriodEnd: quota.currentPeriodEnd,
      hasUsedTrial: quota.hasUsedTrial,
      isInFreePlanTime: quota.isInFreePlanTime,
      trialEndsAt: quota.trialEndsAt,
    },
  });
};
