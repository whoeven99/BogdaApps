import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { useEffect } from "react";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import { GetUnTranslatedWords, storageTranslateImage } from "~/api/JavaServer";
import { globalStore } from "~/globalStore";
export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;

  return {
    shop,
    server: process.env.SERVER_URL,
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const adminAuthResult = await authenticate.admin(request);
    console.log("Auth result:", adminAuthResult);
    const { shop, accessToken } = adminAuthResult.session;
    const { admin } = adminAuthResult;
    const formData = await request.formData();
    const initDataFetcher = JSON.parse(
      formData.get("initDataFetcher") as string,
    );
    const qualityEvaluation = JSON.parse(
      formData.get("qualityEvaluation") as string,
    );
    const findWebPixelId = JSON.parse(formData.get("findWebPixelId") as string);
    const unTranslated = JSON.parse(formData.get("unTranslated") as string);
    const replaceTranslateImage = JSON.parse(
      formData.get("replaceTranslateImage") as string,
    );
    // `#graphql
    //             query getFiles($first: Int, $after: String, $last: Int, $before: String) {
    //               files(first: $first, after: $after, last: $last, before: $before) {
    //                 edges {
    //                   node {
    //                     __typename
    //                     ... on MediaImage {
    //                       id
    //                       image {
    //                         url
    //                         altText
    //                       }
    //                     }
    //                   }
    //                 }
    //                 pageInfo {
    //                   hasNextPage
    //                   hasPreviousPage
    //                   startCursor
    //                   endCursor
    //                 }
    //               }
    //             }
    //           `,
    if (initDataFetcher) {
      try {
        const { type, num, cursor } = initDataFetcher;
        const mutationResponse = await admin.graphql(
          `query {
            products(first: 20) {
              edges {
                node {
                  id
                  title
                  images(first: 20) {
                    edges {
                      node {
                        id
                        url 
                      }
                    }
                    pageInfo {
                      hasNextPage
                      hasPreviousPage
                      startCursor
                      endCursor
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }
            } 
          }`,
          // {
          //   variables:
          //     type === "next"
          //       ? { first: num, after: cursor }
          //       : { last: num, before: cursor },
          // },
        );
        const data = await mutationResponse.json();
        console.log("dasdasdsa: ", data.data.files);
        return {
          success: true,
          response: data,
        };
      } catch (error) {
        console.log("GraphQL Error: ", error);
      }
    }

    if (qualityEvaluation) {
      try {
        console.log("quailtyEvaluation1");

        const mutationResponse = await admin.graphql(
          `
        #graphql
          mutation webPixelCreate($webPixel: WebPixelInput!){
            webPixelCreate(webPixel: $webPixel) {
              userErrors {
                code
                field
                message
              }
              webPixel {
                id
                settings
              }
            }
          }
        `,
          {
            variables: {
              webPixel: {
                settings: JSON.stringify({
                  shopName: shop,
                  server: process.env.SERVER_URL,
                }),
              },
            },
          },
        );
        if (!mutationResponse.ok) {
          console.error("Request failed", mutationResponse);
          return;
        }
        const data = (await mutationResponse.json()) as any;
        if (data.errors) {
          console.error("GraphQL 错误: ", data.errors);
          return {
            success: false,
            response: {
              errorCode: 2,
            },
          };
        }

        if (data.data.webPixelCreate.userErrors.length > 0) {
          console.error("业务错误: ", data.data.webPixelCreate.userErrors);
          return {
            success: false,
            response: {
              errorCode: 3,
            },
          };
        }
        return {
          success: true,
          response: data,
        };
      } catch (error) {
        console.log(`${shop} getOrderData failed`, error);
        return {
          success: false,
          response: {
            errorCode: 1,
          },
        };
      }
    }

    if (findWebPixelId) {
      try {
        const query = `
          query {
            webPixel {
              id
              settings
            }
          }
        `;
        const response = await admin.graphql(query);
        if (!response.ok) {
          return {
            success: false,
            errorCode: response.status,
            errorMsg: response.statusText,
            response: null,
          };
        }

        const data = (await response.json()) as any;
        console.log("findWebPixelId data", data);

        // 再看 GraphQL 层面是否有错误
        if (data.errors) {
          return {
            success: false,
            errorCode: 10002,
            errorMsg: data.errors.map((e: any) => e.message).join(", "),
            response: data,
          };
        }

        return {
          success: true,
          response: data,
        };
      } catch (error) {
        console.log(`${shop} findWebPixel failed`, error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }
    }

    if (unTranslated) {
      try {
        const mutationResponse = await admin.graphql(
          `query MyQuery {
            shopLocales(published: true) {
              locale
              name
              primary
              published
            }
          }`,
        );
        const data = (await mutationResponse.json()) as any;
        let source = "en";
        if (data.data.shopLocales.length > 0) {
          data.data.shopLocales.forEach((item: any) => {
            if (item.primary === true) {
              source = item.locale;
            }
          });
        }
        const { resourceModules } = unTranslated;
        let totalWords = 0;
        const results = await Promise.all(
          resourceModules.map((module: string) =>
            GetUnTranslatedWords({
              shop,
              module,
              accessToken: accessToken as string,
              source,
            }),
          ),
        );

        results.forEach((res) => {
          if (res.success && res.response) {
            totalWords += res.response;
          }
        });
        return {
          success: true,
          response: {
            totalWords,
          },
        };
      } catch (error) {
        console.log("get unTranslated words failed", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        };
      }
    }
    if (replaceTranslateImage) {
      try {
        const { url, userPicturesDoJson } = replaceTranslateImage;
        userPicturesDoJson.shopName = shop;
        const response = await storageTranslateImage({
          shop,
          imageUrl: url,
          userPicturesDoJson,
        });
        return response;
      } catch (error) {
        console.log("error storageImage", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: [],
        };
      }
    }
    
    return {
      success: false,
      message: "Invalid data",
    };
  } catch (error) {
    console.log("Error app action: ", error);
    return { error: "Error app action", status: 500, errorMsg: error };
  }
};
export default function App() {
  const { apiKey, shop, server } = useLoaderData<typeof loader>();
  useEffect(() => {
    globalStore.shop = shop as string;
    globalStore.server = server as string;
  }, []);
  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/management">Image Manage</Link>
        <Link to="/app/alt_management">Alt Manage</Link>
        <Link to="/app/pricing">Pricing</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
