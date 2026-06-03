import { sanitizeUrlLikeEnvValue } from "../../utils/env";

export const ensureWebPixel = async (
  admin: { graphql: (query: string, opts?: { variables?: unknown }) => Promise<{ json: () => Promise<unknown> }> },
  shop: string,
): Promise<void> => {
  let currentWebPixelId: string | undefined;

  try {
    const queryResponse = await admin.graphql(
      `#graphql
        query CurrentWebPixel {
          webPixel { id }
        }
      `,
    );
    const queryJson = (await queryResponse.json()) as { data?: { webPixel?: { id?: string } } };
    currentWebPixelId = queryJson?.data?.webPixel?.id;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    if (!errorMessage.includes("No web pixel was found for this app")) throw error;
    currentWebPixelId = undefined;
  }

  console.log("[web-pixel] query result", { shop, currentWebPixelId });
  if (currentWebPixelId) return;

  const createResponse = await admin.graphql(
    `#graphql
      mutation WebPixelCreate($webPixel: WebPixelInput!) {
        webPixelCreate(webPixel: $webPixel) {
          userErrors { field message code }
          webPixel { id settings }
        }
      }
    `,
    {
      variables: {
        webPixel: {
          settings: {
            shopName: shop,
            server: sanitizeUrlLikeEnvValue(process.env.SHOPIFY_APP_URL),
          },
        },
      },
    },
  );
  const createJson = (await createResponse.json()) as {
    data?: { webPixelCreate?: { userErrors?: Array<{ field: string; message: string; code: string }>; webPixel?: { id?: string } } };
  };
  const createResult = createJson?.data?.webPixelCreate;
  const userErrors = createResult?.userErrors || [];

  if (userErrors.length > 0) {
    console.error("[web-pixel] create userErrors", { shop, userErrors });
    return;
  }

  console.log("[web-pixel] created", { shop, id: createResult?.webPixel?.id });
};
