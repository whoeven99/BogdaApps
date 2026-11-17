import prisma from "~/db.server";

export async function handleAppUninstalled(shop: string): Promise<void> {
  await prisma.account.updateMany({
    where: { shop },
    data: { plan: 1, planType: "Free", subscriptionGid: null },
  });
  await prisma.session.deleteMany({ where: { shop } });
}

export async function handleShopRedact(shop: string): Promise<void> {
  await prisma.userPicture.deleteMany({ where: { shop } });
  await prisma.account.deleteMany({ where: { shop } });
  await prisma.session.deleteMany({ where: { shop } });
}
