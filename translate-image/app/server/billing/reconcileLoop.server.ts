import prisma from "~/db.server";
import { getImageRedisClient } from "~/server/redis.server";
import { getShopAdmin } from "~/server/shop/shopAdminToken.server";
import { APP_SUBSCRIPTION_STATUS } from "./types.server";
import { reconcileShopBilling } from "./reconcile.server";

const LOCK_KEY = "img:billing:reconcile-lock";
const LOCK_TTL_SEC = 300;
const FIRST_DELAY_MS = 2 * 60 * 1000;
const INTERVAL_MS = 30 * 60 * 1000;
const SHOP_GAP_MS = 50;

declare global {
  var __imgBillingReconcileStarted: boolean | undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryAcquireLock(): Promise<boolean> {
  const redis = getImageRedisClient();
  if (redis) {
    const ok = await redis.set(LOCK_KEY, "1", "EX", LOCK_TTL_SEC, "NX");
    return ok === "OK";
  }
  const cutoff = new Date(Date.now() - LOCK_TTL_SEC * 1000);
  const updated = await prisma.billingReconcileLock.updateMany({
    where: { id: "global", lockedAt: { lt: cutoff } },
    data: { lockedAt: new Date() },
  });
  return updated.count > 0;
}

async function listCandidateShops(): Promise<string[]> {
  const [subs, paid] = await Promise.all([
    prisma.appSubscription.findMany({
      where: { status: APP_SUBSCRIPTION_STATUS.ACTIVE },
      select: { shop: true },
    }),
    prisma.account.findMany({
      where: { plan: { gt: 1 } },
      select: { shop: true },
    }),
  ]);
  return [...new Set([...subs, ...paid].map((row) => row.shop))];
}

export async function runBillingReconcileTick(): Promise<void> {
  let locked = false;
  try {
    locked = await tryAcquireLock();
    if (!locked) return;
    const shops = await listCandidateShops();
    for (const shop of shops) {
      try {
        const admin = getShopAdmin({ shop, path: "billing.reconcile" });
        await reconcileShopBilling(shop, admin);
      } catch (err) {
        console.warn(`[billing] reconcile tick shop failed shop=${shop}`, err);
      }
      await sleep(SHOP_GAP_MS);
    }
  } catch (err) {
    console.warn("[billing] reconcile tick failed", err);
  }
}

export function startBillingReconcileLoop(): void {
  if (globalThis.__imgBillingReconcileStarted) return;
  globalThis.__imgBillingReconcileStarted = true;
  const jitter = Math.floor(Math.random() * 30_000);
  setTimeout(() => {
    void runBillingReconcileTick();
    setInterval(() => {
      void runBillingReconcileTick();
    }, INTERVAL_MS);
  }, FIRST_DELAY_MS + jitter);
}
