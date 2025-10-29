import axios from "axios";

//创建一次性订单
export const mutationAppPurchaseOneTimeCreate = async ({
  shop,
  accessToken,
  name,
  price,
  test,
  returnUrl,
}: {
  shop: string;
  accessToken: string;
  name: string;
  price: {
    amount: number;
    currencyCode: string;
  };
  test?: boolean;
  returnUrl: URL;
}) => {
  try {
    // 执行 API 请求
    const response = await axios({
      url: `https://${shop}/admin/api/2025-04/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      data: {
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
          name: `${name} Credits`,
          returnUrl: returnUrl,
          price: {
            amount: price.amount,
            currencyCode: price.currencyCode,
          },
          test: test || false,
        },
      },
    });
    console.log(`${shop} 创建一次性订单`, response.data);

    const res = response.data;
    return res;
  } catch (error) {
    console.error("Error mutationAppPurchaseOneTimeCreate:", error);
  }
};

//创建月度订阅订单
export const mutationAppSubscriptionCreate = async ({
  shop,
  accessToken,
  name,
  price,
  yearly,
  test,
  trialDays,
  returnUrl,
}: {
  shop: string;
  accessToken: string;
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
    // 执行 API 请求
    const response = await axios({
      url: `https://${shop}/admin/api/2025-04/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      data: {
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
          returnUrl: returnUrl,
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
      },
    });
    const res = response.data?.data?.appSubscriptionCreate;

    console.log(`${shop} mutationAppSubscriptionCreate: `, res);

    return res;
  } catch (error) {
    console.error("Error mutationAppSubscriptionCreate:", error);
    return undefined;
  }
};

export const queryShop = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}) => {
  try {
    const query = `{
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
    }`;

    const response = await axios({
      url: `https://${shop}/admin/api/2025-04/graphql.json`,
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken, // 确保使用正确的 Token 名称
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ query }),
    });
    const res = response.data.data.shop;
    console.log("queryShop main currencyCode: ", res?.currencyCode);
    console.log("queryShop currencyCodes: ", res?.currencySettings?.nodes);
    console.log("queryShop currencyFormats: ", res?.currencyFormats);
    return res;
  } catch (error) {
    console.error("Error fetching shop:", error);
    return null;
  }
};
