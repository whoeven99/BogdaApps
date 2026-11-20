import prisma from "../../db.server";
import { sendTencentTemplateEmail, formatUsNumber, parseShopDisplayName } from "../email/tencentSes.server";
import { sendFeishuTextMessage } from "../feishu/sendFeishuTextMessage.server";
import { fetchShopContact } from "../shop/fetchShopContact.server";
import { remainingCredits } from "./quota.server";

const LOG = "[purchaseNotify]";
const TEMPLATE_PURCHASE_SUCCESS = 138372;
const SUBJECT_PURCHASE_SUCCESS =
  "Confirmation of Successful Credits Purchase｜Ciwi-AI Product Description";

function purchaseTemplateId(): number {
  const raw = Number.parseInt(String(process.env.APG_PURCHASE_EMAIL_TEMPLATE_ID ?? ""), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : TEMPLATE_PURCHASE_SUCCESS;
}

export function formatCreditsLabel(credits: number): string {
  return `${formatUsNumber(credits)} Credits`;
}

export function formatPurchaseFeishuText(input: {
  shop: string;
  credits: number;
  amountUsd: number;
  remaining: number;
}): string {
  const amount = Number.isFinite(input.amountUsd) ? input.amountUsd : 0;
  return [
    `💳 购买积分：${input.shop}`,
    `本次购买：${formatCreditsLabel(input.credits)} · $${amount.toFixed(2)}`,
    `可用积分：${formatCreditsLabel(input.remaining)}`,
  ].join("\n");
}

export function buildPurchaseEmailTemplateData(input: {
  userName: string;
  credits: number;
  amountUsd: number;
  shop: string;
  remaining: number;
}): Record<string, string> {
  return {
    user: input.userName,
    number_of_credits: formatCreditsLabel(input.credits),
    amount: `$${input.amountUsd.toFixed(2)}`,
    shop_name: parseShopDisplayName(input.shop),
    total_credits_count: formatCreditsLabel(input.remaining),
  };
}

async function notifyPurchase(params: {
  shop: string;
  credits: number;
  amountUsd: number;
}): Promise<void> {
  const account = await prisma.account.findUnique({ where: { shop: params.shop } });
  const remaining = account ? remainingCredits(account) : params.credits;
  await sendFeishuTextMessage(
    formatPurchaseFeishuText({
      shop: params.shop,
      credits: params.credits,
      amountUsd: params.amountUsd,
      remaining,
    }),
  );

  const contact = await fetchShopContact(params.shop);
  if (!contact.email) {
    console.warn(`${LOG} no shop email shop=${params.shop}`);
    return;
  }
  const ok = await sendTencentTemplateEmail({
    templateId: purchaseTemplateId(),
    subject: SUBJECT_PURCHASE_SUCCESS,
    to: contact.email,
    templateData: buildPurchaseEmailTemplateData({
      userName: contact.ownerName?.trim() || "there",
      credits: params.credits,
      amountUsd: params.amountUsd,
      shop: params.shop,
      remaining,
    }),
  });
  console.info(`${LOG} purchase email shop=${params.shop} credits=${params.credits} ok=${ok}`);
}

/** 首次入账后调用；失败只打日志，不阻断 webhook。 */
export function schedulePurchaseNotify(params: {
  shop: string;
  credits: number;
  amountUsd: number;
}): void {
  void notifyPurchase(params).catch((error) => {
    console.error(`${LOG} unhandled shop=${params.shop}`, error);
  });
}
