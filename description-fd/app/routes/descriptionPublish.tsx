import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { publishOk } from "../lib/publishResult.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const id = String(formData.get("id") || "");
  const pageType = String(formData.get("pageType") || "");
  const contentType = String(formData.get("contentType") || "");
  const description = String(formData.get("description") || "");
  const title = String(formData.get("title") || "").trim();
  const writeTitle = pageType === "product" && contentType === "description" && Boolean(title);

  console.log("descriptionPublish: ", { id, pageType, contentType, writeTitle });

  if (pageType === "product" && contentType === "description") {
    const response = await admin.graphql(
      `#graphql
            mutation UpdateProduct($product: ProductUpdateInput!) {
                productUpdate(product: $product) {
                    product {
                        id
                        title
                        descriptionHtml
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
            `,
      {
        variables: {
          product: {
            id,
            descriptionHtml: description,
            ...(writeTitle ? { title } : {}),
          },
        },
      },
    );
    const data = await response.json();
    const product = data?.data?.productUpdate?.product;
    return publishOk(product?.descriptionHtml, data?.data?.productUpdate?.userErrors, product?.descriptionHtml);
  }

  if (pageType === "product" && contentType === "seo") {
    const response = await admin.graphql(
      `#graphql
            mutation UpdateProduct($product: ProductUpdateInput!) {
                productUpdate(product: $product) {
                    product {
                        id
                        seo { description }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
            `,
      {
        variables: {
          product: {
            id,
            seo: { description },
          },
        },
      },
    );
    const data = await response.json();
    const seoDescription = data?.data?.productUpdate?.product?.seo?.description;
    return publishOk(seoDescription, data?.data?.productUpdate?.userErrors, seoDescription);
  }

  if (pageType === "collection" && contentType === "description") {
    const response = await admin.graphql(
      `#graphql
            mutation UpdateCollection($input: CollectionInput!) {
                collectionUpdate(input: $input) {
                    collection {
                        id
                        descriptionHtml
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
            `,
      {
        variables: {
          input: {
            id,
            descriptionHtml: description,
          },
        },
      },
    );
    const data = await response.json();
    const html = data?.data?.collectionUpdate?.collection?.descriptionHtml;
    return publishOk(html, data?.data?.collectionUpdate?.userErrors, html);
  }

  if (pageType === "collection" && contentType === "seo") {
    const response = await admin.graphql(
      `#graphql
            mutation UpdateCollection($input: CollectionInput!) {
                collectionUpdate(input: $input) {
                    collection {
                        id
                        seo { description }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
            `,
      {
        variables: {
          input: {
            id,
            seo: { description },
          },
        },
      },
    );
    const data = await response.json();
    const seoDescription = data?.data?.collectionUpdate?.collection?.seo?.description;
    return publishOk(seoDescription, data?.data?.collectionUpdate?.userErrors, seoDescription);
  }

  return {
    success: false,
    errorCode: "UNSUPPORTED",
    errorMessage: "Unsupported page or content type",
    data: null,
  };
};
