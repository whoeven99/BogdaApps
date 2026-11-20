/** 无 session 的 webhook 保持 `admin` 为空，避免卸载/合规路径被当成已安装。 */
export function replaceWebhookAdminIfPresent<T extends { admin?: unknown; shop?: unknown }>(
  ctx: T,
  createAdmin: (shop: string) => unknown,
): T {
  if (!ctx.admin) return ctx;
  const shop = String(ctx.shop ?? "").trim();
  if (!shop) return ctx;
  return { ...ctx, admin: createAdmin(shop) as T["admin"] };
}

export async function buildUnauthenticatedAppOnlyAdmin<T>(input: {
  shop: string;
  isInstalled: (shop: string) => Promise<boolean>;
  createAdmin: (shop: string) => T;
}): Promise<{ session: { shop: string }; admin: T }> {
  const shop = input.shop.trim().toLowerCase();
  if (!(await input.isInstalled(shop))) {
    throw new Error(`[app-only-token] shop not installed: ${shop}`);
  }
  return {
    session: { shop },
    admin: input.createAdmin(shop),
  };
}
