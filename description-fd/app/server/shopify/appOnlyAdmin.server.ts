import { getShopAdminGraphql } from "./shopAdminToken.server";

type AuthenticateAdminResult = {
  session: { shop: string };
  admin: { graphql: unknown };
};

/**
 * Replace SDK admin.graphql (Session.accessToken) with application-only GraphQL.
 */
export async function withAppOnlyAdmin<T extends AuthenticateAdminResult>(
  auth: T,
): Promise<T> {
  const graphql = await getShopAdminGraphql(auth.session.shop);
  return {
    ...auth,
    admin: {
      ...auth.admin,
      graphql,
    },
  } as T;
}
