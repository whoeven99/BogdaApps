import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPurchaseEmailTemplateData,
  formatCreditsLabel,
  formatPurchaseFeishuText,
} from "./purchaseNotify.server";

test("purchase feishu text includes shop credits and remaining", () => {
  const text = formatPurchaseFeishuText({
    shop: "demo.myshopify.com",
    credits: 500000,
    amountUsd: 3.99,
    remaining: 480000,
  });
  assert.match(text, /💳 购买积分：demo\.myshopify\.com/);
  assert.match(text, /500,000 Credits · \$3\.99/);
  assert.match(text, /可用积分：480,000 Credits/);
});

test("purchase email template data matches SES field names", () => {
  assert.equal(formatCreditsLabel(1000000), "1,000,000 Credits");
  assert.deepEqual(
    buildPurchaseEmailTemplateData({
      userName: "Ada",
      credits: 500000,
      amountUsd: 3.99,
      shop: "demo.myshopify.com",
      remaining: 500000,
    }),
    {
      user: "Ada",
      number_of_credits: "500,000 Credits",
      amount: "$3.99",
      shop_name: "demo",
      total_credits_count: "500,000 Credits",
    },
  );
});
