import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { listEnabledCatalog } from "~/server/billing/plans/planCatalog.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const catalog = await listEnabledCatalog();
  return json({
    packs: catalog
      .filter((row) => row.kind === "ONE_TIME_PACK")
      .map((row) => ({
        planKey: row.planKey,
        shopifyPlanName: row.shopifyPlanName,
        displayName: row.displayName,
        credits: row.credits,
        priceAmount: Number(row.priceAmount),
      })),
    plans: catalog
      .filter((row) => row.kind === "SUBSCRIPTION")
      .map((row) => ({
        planKey: row.planKey,
        shopifyPlanName: row.shopifyPlanName,
        billingInterval: row.billingInterval,
        credits: row.credits,
        priceAmount: Number(row.priceAmount),
        trialDays: row.trialDays ?? 0,
      })),
  });
};
