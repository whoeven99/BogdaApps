import prisma from "../db.server";

const DEMO_SHOP = "demo-shop.myshopify.com";

export type NotificationLogStatus = "sent" | "failed" | "skipped";

export type NotificationLogView = {
  id: string;
  channel: string;
  provider: string;
  category: string;
  recipient: string;
  subject: string;
  status: NotificationLogStatus;
  error?: string;
  payloadJson?: string;
  createdAt: string;
};

function mapNotificationLog(record: {
  id: string;
  channel: string;
  provider: string;
  category: string;
  recipient: string;
  subject: string;
  status: string;
  error: string | null;
  payloadJson: string | null;
  createdAt: Date;
}): NotificationLogView {
  return {
    id: record.id,
    channel: record.channel,
    provider: record.provider,
    category: record.category,
    recipient: record.recipient,
    subject: record.subject,
    status: record.status as NotificationLogStatus,
    error: record.error ?? undefined,
    payloadJson: record.payloadJson ?? undefined,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function createNotificationLog(input: {
  channel: string;
  provider: string;
  category: string;
  recipient: string;
  subject: string;
  status: NotificationLogStatus;
  error?: string;
  payload?: Record<string, unknown>;
  shop?: string;
}) {
  return prisma.notificationLog.create({
    data: {
      shop: input.shop ?? DEMO_SHOP,
      channel: input.channel,
      provider: input.provider,
      category: input.category,
      recipient: input.recipient,
      subject: input.subject,
      status: input.status,
      error: input.error,
      payloadJson: input.payload ? JSON.stringify(input.payload) : undefined,
    },
  });
}

export async function listNotificationLogs(input?: {
  category?: string;
  status?: NotificationLogStatus | "all";
  limit?: number;
  shop?: string;
}) {
  const records = await prisma.notificationLog.findMany({
    where: {
      shop: input?.shop ?? DEMO_SHOP,
      ...(input?.category ? { category: input.category } : {}),
      ...(input?.status && input.status !== "all"
        ? { status: input.status }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: input?.limit ?? 50,
  });

  return records.map(mapNotificationLog);
}
