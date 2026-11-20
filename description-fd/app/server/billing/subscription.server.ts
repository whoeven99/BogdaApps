import prisma from "../../db.server";

/** 定价页目前没有订阅卡。Shopify 若已有同名订阅，按此入账。 */
export const SUBSCRIPTION_PLANS: Record<string, { credits: number }> = {};

export function resolveSubscriptionAction(
  status: string | undefined,
): "grant" | "clear" | "ignore" {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "ACTIVE") return "grant";
  if (normalized === "CANCELLED" || normalized === "EXPIRED" || normalized === "DECLINED") {
    return "clear";
  }
  return "ignore";
}

export async function applySubscriptionWebhook(input: {
  shop: string;
  name?: string;
  status?: string;
  subscriptionId?: string;
  currentPeriodEnd?: Date | null;
}): Promise<"grant" | "clear" | "ignore"> {
  const action = resolveSubscriptionAction(input.status);
  const subscriptionId = String(input.subscriptionId ?? "").trim();
  const planName = String(input.name ?? "").trim();
  const plan = planName ? SUBSCRIPTION_PLANS[planName] : undefined;
  if (!subscriptionId) return "ignore";

  await prisma.account.upsert({
    where: { shop: input.shop },
    create: { shop: input.shop },
    update: {},
  });

  if (action === "ignore") {
    await prisma.appSubscription.upsert({
      where: { shop: input.shop },
      create: {
        shop: input.shop,
        shopifySubscriptionId: subscriptionId,
        status: String(input.status ?? ""),
        planName,
        creditsPerPeriod: plan?.credits ?? 0,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
      },
      update: {
        shopifySubscriptionId: subscriptionId,
        status: String(input.status ?? ""),
        planName,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
      },
    });
    return "ignore";
  }

  if (action === "clear") {
    await prisma.$transaction([
      prisma.appSubscription.upsert({
        where: { shop: input.shop },
        create: {
          shop: input.shop,
          shopifySubscriptionId: subscriptionId,
          status: String(input.status ?? "CANCELLED"),
          planName,
          creditsPerPeriod: 0,
          currentPeriodEnd: input.currentPeriodEnd ?? null,
        },
        update: {
          shopifySubscriptionId: subscriptionId,
          status: String(input.status ?? "CANCELLED"),
          creditsPerPeriod: 0,
          currentPeriodEnd: input.currentPeriodEnd ?? null,
        },
      }),
      prisma.account.updateMany({
        where: { shop: input.shop },
        data: { subscriptionCredits: 0 },
      }),
    ]);
    return "clear";
  }

  const credits = plan?.credits ?? 0;
  if (!plan) {
    console.error("Unknown subscription plan name", planName);
  }
  const uniqueKey = `sub:${subscriptionId}:ACTIVE`;
  await prisma.$transaction(async (tx) => {
    await tx.appSubscription.upsert({
      where: { shop: input.shop },
      create: {
        shop: input.shop,
        shopifySubscriptionId: subscriptionId,
        status: "ACTIVE",
        planName,
        creditsPerPeriod: credits,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
      },
      update: {
        shopifySubscriptionId: subscriptionId,
        status: "ACTIVE",
        planName,
        creditsPerPeriod: credits,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
      },
    });
    if (credits <= 0) return;
    const existing = await tx.billingLog.findUnique({
      where: { shop_uniqueKey: { shop: input.shop, uniqueKey } },
      select: { id: true },
    });
    if (existing) return;
    await tx.account.upsert({
      where: { shop: input.shop },
      create: { shop: input.shop, subscriptionCredits: credits },
      update: { subscriptionCredits: credits, deletedAt: null },
    });
    await tx.billingLog.create({
      data: {
        shop: input.shop,
        kind: "SUBSCRIBE",
        amount: credits,
        uniqueKey,
        metadata: JSON.stringify({ name: planName }),
      },
    });
  });
  return "grant";
}

export async function clearLocalSubscription(shop: string): Promise<void> {
  await prisma.$transaction([
    prisma.account.updateMany({
      where: { shop },
      data: { subscriptionCredits: 0 },
    }),
    prisma.appSubscription.deleteMany({ where: { shop } }),
  ]);
}
