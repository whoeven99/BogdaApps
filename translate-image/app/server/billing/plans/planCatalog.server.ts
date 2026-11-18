import type { PlanCatalog } from "@prisma/client";
import prisma from "~/db.server";
import { dollarsToCents } from "../chargeGuard";
import { BILLING_INTERVAL, PLAN_KIND } from "../types.server";

export type PlanRecord = Pick<
  PlanCatalog,
  | "planKey"
  | "kind"
  | "billingInterval"
  | "displayName"
  | "credits"
  | "priceAmount"
  | "currencyCode"
  | "trialDays"
  | "shopifyPlanName"
>;

const PLAN_SELECT = {
  planKey: true,
  kind: true,
  billingInterval: true,
  displayName: true,
  credits: true,
  priceAmount: true,
  currencyCode: true,
  trialDays: true,
  shopifyPlanName: true,
} as const;

export function catalogIntervalFromShopify(
  interval: string | null | undefined,
): (typeof BILLING_INTERVAL)[keyof typeof BILLING_INTERVAL] {
  return String(interval || "").toUpperCase() === "ANNUAL"
    ? BILLING_INTERVAL.ANNUAL
    : BILLING_INTERVAL.MONTHLY;
}

export function planNumberForName(name: string): number {
  if (name === "Basic") return 2;
  if (name === "Pro") return 3;
  if (name === "Premium") return 4;
  return 1;
}

export function feeTypeForCatalogInterval(
  interval: string | null | undefined,
): number {
  return interval === BILLING_INTERVAL.ANNUAL ? 1 : 0;
}

export async function getPlanByKey(planKey: string): Promise<PlanRecord | null> {
  return prisma.planCatalog.findUnique({
    where: { planKey },
    select: PLAN_SELECT,
  });
}

export async function findSubscriptionPlan(params: {
  shopifyPlanName: string;
  billingInterval: string;
}): Promise<PlanRecord | null> {
  return prisma.planCatalog.findFirst({
    where: {
      kind: PLAN_KIND.SUBSCRIPTION,
      shopifyPlanName: params.shopifyPlanName,
      billingInterval: catalogIntervalFromShopify(params.billingInterval),
      enabled: true,
    },
    select: PLAN_SELECT,
  });
}

export async function findPackPlanByName(
  shopifyPlanName: string,
): Promise<PlanRecord | null> {
  return prisma.planCatalog.findFirst({
    where: {
      kind: PLAN_KIND.ONE_TIME_PACK,
      shopifyPlanName,
      enabled: true,
    },
    select: PLAN_SELECT,
  });
}

export async function listEnabledCatalog(): Promise<PlanRecord[]> {
  return prisma.planCatalog.findMany({
    where: { enabled: true },
    orderBy: { sortOrder: "asc" },
    select: PLAN_SELECT,
  });
}

export async function listEnabledPlans(): Promise<PlanRecord[]> {
  return prisma.planCatalog.findMany({
    where: { enabled: true, kind: PLAN_KIND.SUBSCRIPTION },
    orderBy: { sortOrder: "asc" },
    select: PLAN_SELECT,
  });
}

export async function listEnabledPacks(): Promise<PlanRecord[]> {
  return prisma.planCatalog.findMany({
    where: { enabled: true, kind: PLAN_KIND.ONE_TIME_PACK },
    orderBy: { sortOrder: "asc" },
    select: PLAN_SELECT,
  });
}

export function allowedChargeCents(rows: PlanRecord[]): number[] {
  const cents = new Set<number>();
  for (const row of rows) {
    const monthly = dollarsToCents(row.priceAmount);
    if (monthly == null) continue;
    cents.add(monthly);
    if (
      row.kind === PLAN_KIND.SUBSCRIPTION &&
      row.billingInterval === BILLING_INTERVAL.ANNUAL
    ) {
      cents.add(monthly * 12);
    }
  }
  return [...cents];
}

export async function loadAllowedChargeCents(): Promise<number[]> {
  return allowedChargeCents(await listEnabledCatalog());
}
