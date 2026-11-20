import prisma from "../../db.server";
import { ensureAccount } from "../billing/ensureAccount.server";

export type TemplateDto = {
  id: number;
  templateData: string;
  templateTitle: string;
  templateType: string;
  templateDescription: string;
  templateClass: boolean;
  templateModel: string;
  templateSubtype: string;
  isPayment: boolean;
  isUserUsed: boolean;
};

export type TemplateSource = "official" | "user";

function officialToDto(
  row: {
    id: number;
    templateData: string;
    templateTitle: string;
    templateType: string;
    templateDescription: string;
    templateModel: string;
    templateSubtype: string;
    isPayment: boolean;
  },
  usedIds: Set<number>,
): TemplateDto {
  return {
    id: row.id,
    templateData: row.templateData,
    templateTitle: row.templateTitle,
    templateType: row.templateType,
    templateDescription: row.templateDescription,
    templateClass: false,
    templateModel: row.templateModel,
    templateSubtype: row.templateSubtype,
    isPayment: row.isPayment,
    isUserUsed: usedIds.has(row.id),
  };
}

function userToDto(row: {
  id: number;
  templateData: string;
  templateTitle: string;
  templateType: string;
  templateDescription: string;
  templateModel: string;
  templateSubtype: string;
}): TemplateDto {
  return {
    id: row.id,
    templateData: row.templateData,
    templateTitle: row.templateTitle,
    templateType: row.templateType,
    templateDescription: row.templateDescription,
    templateClass: true,
    templateModel: row.templateModel,
    templateSubtype: row.templateSubtype,
    isPayment: false,
    isUserUsed: true,
  };
}

function matchesFilter(
  model: string,
  subtype: string,
  pageType: string | null,
  contentType: string | null,
): boolean {
  if (pageType && model !== pageType) return false;
  if (contentType && subtype !== contentType) return false;
  return true;
}

export async function listPickedTemplates(
  shop: string,
  pageType: string | null,
  contentType: string | null,
): Promise<TemplateDto[]> {
  await ensureAccount(shop);
  const picks = await prisma.shopTemplatePick.findMany({ where: { shop } });
  const officialIds = picks.filter((p) => p.source === "official").map((p) => p.templateId);
  const userIds = picks.filter((p) => p.source === "user").map((p) => p.templateId);
  const [officials, users] = await Promise.all([
    officialIds.length
      ? prisma.officialTemplate.findMany({ where: { id: { in: officialIds } } })
      : Promise.resolve([]),
    userIds.length
      ? prisma.userTemplate.findMany({
          where: { shop, deletedAt: null, id: { in: userIds } },
        })
      : Promise.resolve([]),
  ]);
  const used = new Set(officialIds);
  return [
    ...officials.map((row) => officialToDto(row, used)),
    ...users.map(userToDto),
  ].filter((row) => matchesFilter(row.templateModel, row.templateSubtype, pageType, contentType));
}

export async function listCatalog(
  shop: string,
  input: {
    pageType: string | null;
    contentType: string | null;
    templateType: string | null;
    templateClass: boolean;
  },
): Promise<TemplateDto[]> {
  await ensureAccount(shop);
  if (input.templateClass) {
    const rows = await prisma.userTemplate.findMany({
      where: { shop, deletedAt: null },
    });
    return rows
      .filter((row) => matchesFilter(row.templateModel, row.templateSubtype, input.pageType, input.contentType))
      .filter((row) => !input.templateType || row.templateType === input.templateType)
      .map(userToDto);
  }
  const picks = await prisma.shopTemplatePick.findMany({
    where: { shop, source: "official" },
    select: { templateId: true },
  });
  const used = new Set(picks.map((p) => p.templateId));
  const rows = await prisma.officialTemplate.findMany();
  return rows
    .filter((row) => matchesFilter(row.templateModel, row.templateSubtype, input.pageType, input.contentType))
    .filter((row) => !input.templateType || row.templateType === input.templateType)
    .map((row) => officialToDto(row, used));
}

export async function addPick(
  shop: string,
  templateId: number,
  source: TemplateSource,
): Promise<boolean> {
  await ensureAccount(shop);
  await prisma.shopTemplatePick.upsert({
    where: { shop_source_templateId: { shop, source, templateId } },
    create: { shop, source, templateId },
    update: {},
  });
  return true;
}

export async function removeUserTemplate(
  shop: string,
  id: number,
  templateClass: boolean,
): Promise<boolean> {
  await ensureAccount(shop);
  if (templateClass) {
    await prisma.userTemplate.updateMany({
      where: { shop, id },
      data: { deletedAt: new Date() },
    });
    await prisma.shopTemplatePick.deleteMany({
      where: { shop, source: "user", templateId: id },
    });
    return true;
  }
  await prisma.shopTemplatePick.deleteMany({
    where: { shop, source: "official", templateId: id },
  });
  return true;
}

export async function createUserTemplate(
  shop: string,
  input: {
    templateData: string;
    templateTitle: string;
    templateDescription: string;
    templateType: string;
    templateModel: string;
    templateSubtype: string;
  },
) {
  await ensureAccount(shop);
  const row = await prisma.userTemplate.create({
    data: {
      shop,
      templateData: input.templateData,
      templateTitle: input.templateTitle,
      templateDescription: input.templateDescription,
      templateType: input.templateType,
      templateModel: input.templateModel,
      templateSubtype: input.templateSubtype,
    },
  });
  await prisma.shopTemplatePick.upsert({
    where: { shop_source_templateId: { shop, source: "user", templateId: row.id } },
    create: { shop, source: "user", templateId: row.id },
    update: {},
  });
  return row;
}

export async function previewOfficial(templateId: number): Promise<string> {
  const row = await prisma.officialTemplate.findUnique({ where: { id: templateId } });
  return row?.exampleData || row?.templateData || "";
}

export async function loadTemplatePrompt(
  shop: string,
  templateId: number,
  source: TemplateSource,
): Promise<string> {
  if (!templateId) return "";
  if (source === "official") {
    const row = await prisma.officialTemplate.findUnique({ where: { id: templateId } });
    return row?.templateData || "";
  }
  const row = await prisma.userTemplate.findFirst({
    where: { shop, id: templateId, deletedAt: null },
  });
  return row?.templateData || "";
}
