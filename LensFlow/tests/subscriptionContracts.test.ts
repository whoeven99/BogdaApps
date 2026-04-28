import test from "node:test";
import assert from "node:assert/strict";

import { summarizeSubscriptionContracts } from "../app/services/subscription-contracts.server.js";

test("订阅合同汇总应统计状态与账单尝试数量", () => {
  const summary = summarizeSubscriptionContracts([
    {
      id: "gid://shopify/SubscriptionContract/1",
      status: "ACTIVE",
      createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-01-01T00:05:00.000Z").toISOString(),
      customer: {
        id: "gid://shopify/Customer/1",
        displayName: "Alice",
      },
      lines: [
        {
          id: "line-1",
          productId: "gid://shopify/Product/1",
          title: "月抛隐形眼镜",
          quantity: 1,
        },
      ],
      billingAttempts: [
        {
          id: "attempt-1",
          ready: true,
          orderId: "gid://shopify/Order/1",
        },
      ],
    },
    {
      id: "gid://shopify/SubscriptionContract/2",
      status: "FAILED",
      createdAt: new Date("2026-01-02T00:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-01-02T00:05:00.000Z").toISOString(),
      lines: [],
      billingAttempts: [
        {
          id: "attempt-2",
          ready: false,
          errorCode: "INSUFFICIENT_INVENTORY",
          errorMessage: "库存不足",
        },
      ],
    },
  ]);

  assert.deepEqual(summary, {
    total: 2,
    ACTIVE: 1,
    PAUSED: 0,
    FAILED: 1,
    CANCELLED: 0,
    EXPIRED: 0,
    billingAttemptCount: 2,
    failedBillingAttemptCount: 1,
  });
});
