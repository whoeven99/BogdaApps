type AdminGraphql = (
  query: string,
  options?: { variables?: Record<string, unknown> },
) => Promise<Response>;

export type PublishUserError = { code?: string; message?: string; field?: string[] };

export type PublishGeneratedResult = {
  ok: boolean;
  value: string | null;
  userErrors: PublishUserError[];
};

export type PublishGeneratedInput = {
  graphql: AdminGraphql;
  resourceId: string;
  pageType: string;
  contentType: string;
  description: string;
  title?: string;
};

function firstError(errors: PublishUserError[]): string | null {
  return errors[0]?.message ?? null;
}

async function readGraphql(response: Response): Promise<{
  product?: Record<string, unknown> | null;
  collection?: Record<string, unknown> | null;
  userErrors: PublishUserError[];
}> {
  const json = (await response.json()) as {
    data?: {
      productUpdate?: { product?: Record<string, unknown> | null; userErrors?: PublishUserError[] };
      collectionUpdate?: { collection?: Record<string, unknown> | null; userErrors?: PublishUserError[] };
    };
  };
  const productUpdate = json.data?.productUpdate;
  const collectionUpdate = json.data?.collectionUpdate;
  return {
    product: productUpdate?.product ?? null,
    collection: collectionUpdate?.collection ?? null,
    userErrors: productUpdate?.userErrors ?? collectionUpdate?.userErrors ?? [],
  };
}

function resultFrom(value: string | null | undefined, userErrors: PublishUserError[]): PublishGeneratedResult {
  const error = firstError(userErrors);
  if (error || value == null) {
    return { ok: false, value: null, userErrors };
  }
  return { ok: true, value, userErrors };
}

export async function publishGeneratedContent(
  input: PublishGeneratedInput,
): Promise<PublishGeneratedResult> {
  const { graphql, resourceId, pageType, contentType, description } = input;
  const writeTitle = pageType === "product" && contentType === "description" && Boolean(input.title);

  if (pageType === "product" && contentType === "description") {
    const body = await readGraphql(
      await graphql(
        `#graphql
        mutation UpdateProduct($product: ProductUpdateInput!) {
          productUpdate(product: $product) {
            product { id title descriptionHtml }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            product: {
              id: resourceId,
              descriptionHtml: description,
              ...(writeTitle ? { title: input.title } : {}),
            },
          },
        },
      ),
    );
    return resultFrom(
      typeof body.product?.descriptionHtml === "string" ? body.product.descriptionHtml : null,
      body.userErrors,
    );
  }

  if (pageType === "product" && contentType === "seo") {
    const body = await readGraphql(
      await graphql(
        `#graphql
        mutation UpdateProduct($product: ProductUpdateInput!) {
          productUpdate(product: $product) {
            product { id seo { description } }
            userErrors { field message }
          }
        }`,
        { variables: { product: { id: resourceId, seo: { description } } } },
      ),
    );
    const seo = body.product?.seo as { description?: string } | undefined;
    return resultFrom(seo?.description ?? null, body.userErrors);
  }

  if (pageType === "collection" && contentType === "description") {
    const body = await readGraphql(
      await graphql(
        `#graphql
        mutation UpdateCollection($input: CollectionInput!) {
          collectionUpdate(input: $input) {
            collection { id descriptionHtml }
            userErrors { field message }
          }
        }`,
        { variables: { input: { id: resourceId, descriptionHtml: description } } },
      ),
    );
    return resultFrom(
      typeof body.collection?.descriptionHtml === "string" ? body.collection.descriptionHtml : null,
      body.userErrors,
    );
  }

  if (pageType === "collection" && contentType === "seo") {
    const body = await readGraphql(
      await graphql(
        `#graphql
        mutation UpdateCollection($input: CollectionInput!) {
          collectionUpdate(input: $input) {
            collection { id seo { description } }
            userErrors { field message }
          }
        }`,
        { variables: { input: { id: resourceId, seo: { description } } } },
      ),
    );
    const seo = body.collection?.seo as { description?: string } | undefined;
    return resultFrom(seo?.description ?? null, body.userErrors);
  }

  return {
    ok: false,
    value: null,
    userErrors: [{ code: "UNSUPPORTED", message: "Unsupported page or content type" }],
  };
}
