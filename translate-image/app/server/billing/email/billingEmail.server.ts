import { sendTencentTemplateEmail } from "~/server/email/tencentSes.server";
import {
  buildPurchaseTemplateData,
  buildRenewalTemplateData,
  buildSubscribeTemplateData,
  buildWelcomeTemplateData,
  maskEmail,
} from "~/server/email/emailFormat";
import { fetchShopContact } from "~/server/shop/fetchShopContact.server";
import { getAccountQuota } from "../quota.server";

const LOG = "[imgEmail]";

const TEMPLATE_WELCOME = 158999;
const TEMPLATE_PURCHASE = 159001;
const TEMPLATE_SUBSCRIBE = 159003;
const TEMPLATE_RENEWAL = 159005;

const SUBJECT_WELCOME =
  "Welcome to Ciwi Image Translate — Start Localizing Your Images Instantly";
const SUBJECT_PURCHASE = "Image Translation Credits Have Been Added Successfully";
const SUBJECT_SUBSCRIBE = "Your Ciwi Image Translate Subscription Is Now Active";
const SUBJECT_RENEWAL = "Your Plan Has Renewed — Ciwi Image Translate";

function logDetail(phase: string, payload: Record<string, unknown>): void {
  console.info(`${LOG} ${phase} ${JSON.stringify(payload)}`);
}

async function sendWithContact(params: {
  shop: string;
  kind: string;
  templateId: number;
  subject: string;
  build: (name: string) => Record<string, string> | null;
}): Promise<boolean> {
  const shop = params.shop.trim();
  logDetail("schedule-start", { shop, kind: params.kind, templateId: params.templateId });
  if (!shop) {
    logDetail("send-skipped", { kind: params.kind, reason: "empty_shop" });
    return false;
  }

  const contact = await fetchShopContact(shop);
  const userName = contact.ownerName?.trim() || "there";
  logDetail("contact-resolved", {
    shop,
    kind: params.kind,
    hasEmail: Boolean(contact.email),
    to: contact.email ? maskEmail(contact.email) : null,
    userName: contact.ownerName?.trim() ? userName : contact.email ? "there" : null,
  });
  if (!contact.email) {
    logDetail("send-skipped", { shop, kind: params.kind, reason: "no_recipient" });
    return false;
  }

  const templateData = params.build(userName);
  if (!templateData) return false;

  const ok = await sendTencentTemplateEmail({
    templateId: params.templateId,
    subject: params.subject,
    to: contact.email,
    templateData,
  });
  logDetail(ok ? "send-success" : "send-failed", {
    shop,
    kind: params.kind,
    templateId: params.templateId,
    to: maskEmail(contact.email),
  });
  return ok;
}

export async function sendWelcomeEmail(shop: string): Promise<boolean> {
  return sendWithContact({
    shop,
    kind: "welcome",
    templateId: TEMPLATE_WELCOME,
    subject: SUBJECT_WELCOME,
    build: (name) => buildWelcomeTemplateData(name),
  });
}

export function scheduleWelcomeEmail(shop: string): void {
  void sendWelcomeEmail(shop).catch((error) => {
    console.error(`${LOG} unhandled kind=welcome shop=${shop}`, error);
  });
}

export async function sendPurchaseEmail(params: {
  shop: string;
  purchasedCredits: number;
}): Promise<boolean> {
  const quota = await getAccountQuota(params.shop);
  return sendWithContact({
    shop: params.shop,
    kind: "purchase",
    templateId: TEMPLATE_PURCHASE,
    subject: SUBJECT_PURCHASE,
    build: (name) =>
      buildPurchaseTemplateData({
        name,
        purchasedCredits: params.purchasedCredits,
        remainingCredits: quota?.remaining ?? params.purchasedCredits,
        purchaseTime: new Date(),
      }),
  });
}

export function schedulePurchaseEmail(params: {
  shop: string;
  purchasedCredits: number;
}): void {
  void sendPurchaseEmail(params).catch((error) => {
    console.error(`${LOG} unhandled kind=purchase shop=${params.shop}`, error);
  });
}

export async function sendSubscribeEmail(params: {
  shop: string;
  shopifyPlanName: string;
  billingInterval: string;
  creditsPerPeriod: number;
  periodStart: Date | null;
  periodEnd: Date | null;
}): Promise<boolean> {
  if (!params.periodStart || !params.periodEnd) {
    logDetail("send-skipped", {
      shop: params.shop,
      kind: "subscribe",
      reason: "missing_period",
    });
    return false;
  }
  const periodStart = params.periodStart;
  const periodEnd = params.periodEnd;
  return sendWithContact({
    shop: params.shop,
    kind: "subscribe",
    templateId: TEMPLATE_SUBSCRIBE,
    subject: SUBJECT_SUBSCRIBE,
    build: (name) =>
      buildSubscribeTemplateData({
        name,
        shopifyPlanName: params.shopifyPlanName,
        billingInterval: params.billingInterval,
        creditsPerPeriod: params.creditsPerPeriod,
        periodStart,
        periodEnd,
      }),
  });
}

export function scheduleSubscribeEmail(params: {
  shop: string;
  shopifyPlanName: string;
  billingInterval: string;
  creditsPerPeriod: number;
  periodStart: Date | null;
  periodEnd: Date | null;
}): void {
  void sendSubscribeEmail(params).catch((error) => {
    console.error(`${LOG} unhandled kind=subscribe shop=${params.shop}`, error);
  });
}

export async function sendRenewalEmail(params: {
  shop: string;
  shopifyPlanName: string;
  billingInterval: string;
  creditsPerPeriod: number;
}): Promise<boolean> {
  const quota = await getAccountQuota(params.shop);
  return sendWithContact({
    shop: params.shop,
    kind: "renewal",
    templateId: TEMPLATE_RENEWAL,
    subject: SUBJECT_RENEWAL,
    build: (name) =>
      buildRenewalTemplateData({
        name,
        shopifyPlanName: params.shopifyPlanName,
        billingInterval: params.billingInterval,
        creditsPerPeriod: params.creditsPerPeriod,
        remainingCredits: quota?.remaining ?? params.creditsPerPeriod,
      }),
  });
}

export function scheduleRenewalEmail(params: {
  shop: string;
  shopifyPlanName: string;
  billingInterval: string;
  creditsPerPeriod: number;
}): void {
  void sendRenewalEmail(params).catch((error) => {
    console.error(`${LOG} unhandled kind=renewal shop=${params.shop}`, error);
  });
}
