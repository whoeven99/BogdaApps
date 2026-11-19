import { postShopGraphql } from "~/server/shop/shopAdminToken.server";

export const mutationAppPurchaseOneTimeCreate = async ({
  shop,
  name,
  price,
  test,
  returnUrl,
}: {
  shop: string;
  name: string;
  price: {
    amount: number;
    currencyCode: string;
  };
  test?: boolean;
  returnUrl: URL;
}) => {
  try {
    const res = await postShopGraphql({
      shop,
      path: "billing.oneTimeCreate",
      query: `mutation AppPurchaseOneTimeCreate($name: String!, $price: MoneyInput!, $returnUrl: URL! $test: Boolean) {
          appPurchaseOneTimeCreate(name: $name, returnUrl: $returnUrl, price: $price, test: $test) {
            userErrors {
              field
              message
            }
            appPurchaseOneTime {
              createdAt
              id
              name
              price {
                amount
                currencyCode
              }
              status
            }
            confirmationUrl
          }
        }`,
      variables: {
        name: `${name} extra times`,
        returnUrl,
        price: {
          amount: price.amount,
          currencyCode: price.currencyCode,
        },
        test: test || false,
      },
    });
    console.log(`${shop} 创建一次性订单`, res);
    return res;
  } catch (error) {
    console.error(`${shop} Error mutationAppPurchaseOneTimeCreate:`, error);
  }
};

export const mutationAppSubscriptionCreate = async ({
  shop,
  name,
  price,
  yearly,
  test,
  trialDays,
  returnUrl,
}: {
  shop: string;
  name: string;
  yearly?: boolean;
  price: {
    amount: number;
    currencyCode: string;
  };
  test?: boolean;
  trialDays: number;
  returnUrl: URL;
}) => {
  try {
    const res = await postShopGraphql({
      shop,
      path: "billing.subscriptionCreate",
      query: `mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $replacementBehavior: AppSubscriptionReplacementBehavior, $returnUrl: URL!, $trialDays: Int!, $test: Boolean) {
          appSubscriptionCreate(
            name: $name
            returnUrl: $returnUrl
            lineItems: $lineItems
            trialDays: $trialDays
            test: $test
            replacementBehavior: $replacementBehavior
          ) {
            userErrors {
              field
              message
            }
            appSubscription {
              id
              createdAt
              currentPeriodEnd
              name
              returnUrl
              status
              test
              trialDays
            }
            confirmationUrl
          }
        }`,
      variables: {
        name: `${name}`,
        returnUrl,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                interval: yearly ? "ANNUAL" : "EVERY_30_DAYS",
                price: {
                  amount: price.amount,
                  currencyCode: price.currencyCode,
                },
              },
            },
          },
        ],
        replacementBehavior: "APPLY_IMMEDIATELY",
        trialDays: trialDays,
        test: test || false,
      },
    });
    const created = res?.data?.appSubscriptionCreate;
    console.log(`${shop} mutationAppSubscriptionCreate: `, created);
    return created;
  } catch (error) {
    console.error("Error mutationAppSubscriptionCreate:", error);
    return undefined;
  }
};

export const queryShop = async ({ shop }: { shop: string }) => {
  try {
    const res = await postShopGraphql({
      shop,
      path: "shop.query",
      query: `{
      shop {
        name
        shopOwnerName
        email
        currencyCode
        currencySettings(first: 100) {
          nodes {
            currencyCode
            currencyName
            enabled
          }
        }
        myshopifyDomain
        currencyFormats {
          moneyFormat
          moneyWithCurrencyFormat
        }      
      }
    }`,
    });
    const shopNode = res?.data?.shop;
    console.log("queryShop main currencyCode: ", shopNode?.currencyCode);
    return shopNode;
  } catch (error) {
    console.error("Error fetching shop:", error);
    return null;
  }
};
