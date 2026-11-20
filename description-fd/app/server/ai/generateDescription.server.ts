import { htmlToPlainText } from "../../lib/generatedDescriptionJson.server";
import { generateDescriptionJson } from "./descriptionAiClient.server";

type AdminGraphql = (
  query: string,
  options?: { variables?: Record<string, unknown> },
) => Promise<Response>;

export type GenerateDescriptionInput = {
  admin: { graphql: AdminGraphql };
  resourceId: string;
  pageType: string;
  contentType: string;
  languageStyle: string;
  brandStyle?: string;
  language: string;
  seoKeywords?: string;
  brandWord?: string;
  brandSlogan?: string;
  additionalInformation?: string;
  model: string;
};

type ResourceContext = {
  id: string;
  title: string;
  descriptionHtml: string;
  extra: Record<string, unknown>;
};

function writesTitle(pageType: string, contentType: string): boolean {
  return pageType === "product" && contentType === "description";
}

async function loadProductContext(admin: { graphql: AdminGraphql }, id: string): Promise<ResourceContext> {
  const response = await admin.graphql(
    `#graphql
    query GenerateProductContext($id: ID!) {
      product(id: $id) {
        id
        title
        descriptionHtml
        vendor
        productType
        tags
        variants(first: 8) {
          nodes {
            title
            sku
            selectedOptions { name value }
          }
        }
      }
    }`,
    { variables: { id } },
  );
  const json = (await response.json()) as {
    data?: { product?: Record<string, unknown> | null };
    errors?: Array<{ message?: string }>;
  };
  const product = json.data?.product;
  if (!product) {
    throw new Error(json.errors?.[0]?.message || "Product not found");
  }
  return {
    id: String(product.id ?? id),
    title: String(product.title ?? ""),
    descriptionHtml: String(product.descriptionHtml ?? ""),
    extra: {
      vendor: product.vendor,
      productType: product.productType,
      tags: product.tags,
      variants: product.variants,
    },
  };
}

async function loadCollectionContext(admin: { graphql: AdminGraphql }, id: string): Promise<ResourceContext> {
  const response = await admin.graphql(
    `#graphql
    query GenerateCollectionContext($id: ID!) {
      collection(id: $id) {
        id
        title
        descriptionHtml
      }
    }`,
    { variables: { id } },
  );
  const json = (await response.json()) as {
    data?: { collection?: Record<string, unknown> | null };
    errors?: Array<{ message?: string }>;
  };
  const collection = json.data?.collection;
  if (!collection) {
    throw new Error(json.errors?.[0]?.message || "Collection not found");
  }
  return {
    id: String(collection.id ?? id),
    title: String(collection.title ?? ""),
    descriptionHtml: String(collection.descriptionHtml ?? ""),
    extra: {},
  };
}

export async function generateDescriptionCopy(input: GenerateDescriptionInput) {
  const includeTitle = writesTitle(input.pageType, input.contentType);
  const context =
    input.pageType === "collection"
      ? await loadCollectionContext(input.admin, input.resourceId)
      : await loadProductContext(input.admin, input.resourceId);

  const descriptionKind =
    input.contentType === "seo"
      ? "plain-text SEO meta description (about 120-160 characters, no HTML)"
      : "HTML body description for Shopify";

  const system = [
    `You write Shopify ${input.pageType} copy.`,
    `Return JSON only with keys "title" and "description". No markdown.`,
    includeTitle
      ? "Write a new product title in `title` and the new description in `description`."
      : "Copy the current title into `title` unchanged. Do not rename. Put the new copy in `description`.",
    `description must be a ${descriptionKind}.`,
    `Language: ${input.language || "English"}.`,
    `Tone: ${input.languageStyle || "formal"}.`,
    input.brandStyle ? `Brand style: ${input.brandStyle}.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const user = JSON.stringify({
    currentTitle: context.title,
    currentDescription: htmlToPlainText(context.descriptionHtml).slice(0, 4000),
    ...context.extra,
    seoKeywords: input.seoKeywords || "",
    brandWord: input.brandWord || "",
    brandSlogan: input.brandSlogan || "",
    additionalInformation: input.additionalInformation || "",
  });

  const generated = await generateDescriptionJson(input.model, [
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  return {
    id: context.id,
    pageType: input.pageType,
    contentType: input.contentType,
    title: includeTitle ? generated.title || context.title : context.title,
    description: generated.description,
  };
}
