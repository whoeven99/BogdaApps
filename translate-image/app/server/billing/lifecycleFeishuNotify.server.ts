import { sendFeishuTextMessage } from "~/server/feishu/sendFeishuTextMessage.server";

async function notify(log: string, shop: string, text: string): Promise<void> {
  const result = await sendFeishuTextMessage(text);
  if (!result.ok && !("skipped" in result && result.skipped)) {
    console.warn(`${log} send failed shop=${shop}`, result);
  }
}

export function scheduleInstallFeishu(shop: string): void {
  void notify("[lifecycleFeishu:install]", shop, `图译安装 · ${shop}`).catch((err) => {
    console.warn("[lifecycleFeishu:install] shop=", shop, err);
  });
}

export function scheduleSubscribeFeishu(params: {
  shop: string;
  planKey: string;
  inTrial: boolean;
  first: boolean;
}): void {
  const { shop, planKey, inTrial, first } = params;
  const title = first ? "图译首次订阅" : "图译订阅";
  const trial = inTrial ? " · 试用中" : "";
  void notify(
    "[lifecycleFeishu:subscribe]",
    shop,
    `${title} · ${shop}\n套餐：${planKey}${trial}`,
  ).catch((err) => {
    console.warn("[lifecycleFeishu:subscribe] shop=", shop, err);
  });
}

export function schedulePurchaseFeishu(shop: string, credits: number): void {
  void notify(
    "[lifecycleFeishu:purchase]",
    shop,
    `图译购买积分 · ${shop}\n积分：${credits}`,
  ).catch((err) => {
    console.warn("[lifecycleFeishu:purchase] shop=", shop, err);
  });
}

export function scheduleCancelFeishu(shop: string, status: string): void {
  void notify(
    "[lifecycleFeishu:cancel]",
    shop,
    `图译订阅取消 · ${shop}\n状态：${status}`,
  ).catch((err) => {
    console.warn("[lifecycleFeishu:cancel] shop=", shop, err);
  });
}

export function scheduleChargeGuardDeniedFeishu(params: {
  shop: string;
  reason: string;
  gid: string;
}): void {
  const { shop, reason, gid } = params;
  void notify(
    "[lifecycleFeishu:charge-guard]",
    shop,
    `图译入账闸拒绝 · ${shop}\n原因：${reason}\nGID：${gid}`,
  ).catch((err) => {
    console.warn("[lifecycleFeishu:charge-guard] shop=", shop, err);
  });
}
