import { useEffect, useRef, useState } from "react";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  Layout,
  InlineStack,
  Pagination,
  Icon,
  Select,
  Spinner,
  Thumbnail,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import {
  ArrowLeftIcon,
  NoteIcon,
  SortIcon,
  ImageIcon,
} from "@shopify/polaris-icons";
import { UploadOutlined, SearchOutlined } from "@ant-design/icons";
import { authenticate } from "../../shopify.server";
import {
  Table,
  Checkbox,
  Image,
  Affix,
  Typography,
  Skeleton,
  Button,
  Tabs,
  Tag,
  Space,
  Modal,
  Row,
  Col,
  Input,
  Upload,
  Flex,
  Card,
  Select as SelectAnt,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import { useNavigate, useFetcher, useLoaderData } from "@remix-run/react";
import { globalStore } from "~/globalStore";
import {
  DeleteProductImageData,
  GetProductImageData,
  TranslateImage,
} from "~/api/JavaServer";
import SortPopover from "./conponents/SortPopover";
const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
interface ImageItem {
  id: string;
  src: string;
  section: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  return {
    searchTerm,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { admin } = adminAuthResult;

  const { shop, accessToken } = adminAuthResult.session;
  const formData = await request.formData();
  const loading = JSON.parse(formData.get("loading") as string);
  const languageLoading = JSON.parse(formData.get("languageLoading") as string);
  const productStartCursor: any = JSON.parse(
    formData.get("productStartCursor") as string,
  );
  const productEndCursor: any = JSON.parse(
    formData.get("productEndCursor") as string,
  );
  const imageStartCursor: any = JSON.parse(
    formData.get("imageStartCursor") as string,
  );
  const imageEndCursor: any = JSON.parse(
    formData.get("imageEndCursor") as string,
  );

  try {
    const queryString = (productCursor: any) => {
      const { query, status } = productCursor || { query: "", status: "" };
      let str = "";

      if (status && status !== "ALL") {
        str += `status:${status.toUpperCase()} `;
      }

      if (query && query.trim()) {
        str += `${query.trim()}`;
      }

      return str.trim();
    };
    switch (true) {
      case !!loading:
        try {
          console.log("loading: ", loading);
          const { lastRequestCursor, direction } = loading;
          const loadData = await admin.graphql(
            `query products( $sortKey: ProductSortKeys, $reverse: Boolean){
            products(first: 10,sortKey: $sortKey, reverse: $reverse) {
              edges {
                node {
                  id
                  title
                  status
                  images(first: 20) {
                    edges {
                      node {
                        id
                        url 
                        altText
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
            {
              variables: {
                sortKey: loading?.sortKey || "TITLE",
                reverse: loading?.reverse ?? false,
              },
            },
          );

          const response = await loadData.json();

          console.log("loadData", response?.data?.products?.edges);
          if (response?.data?.products?.edges.length > 0) {
            const menuData = response?.data?.products?.edges.map(
              (item: any) => {
                return {
                  key: item?.node?.id,
                  label: item?.node?.title,
                  imageData: item?.node?.images,
                  status: item?.node?.status,
                };
              },
            );
            const imageData = response?.data?.products?.edges.map(
              (item: any) => {
                return item?.node?.images?.edges.map((image: any) => {
                  return {
                    key: image?.node?.id,
                    altText: image?.node?.altText,
                    productId: item?.node?.id,
                    productTitle: item?.node?.title,
                    imageId: image?.node?.id,
                    imageUrl: image?.node?.url,
                    targetImageUrl: "",
                    imageStartCursor: item?.node?.images?.pageInfo?.startCursor,
                    imageEndCursor: item?.node?.images?.pageInfo?.endCursor,
                    imageHasNextPage: item?.node?.images?.pageInfo?.hasNextPage,
                    imageHasPreviousPage:
                      item?.node?.images?.pageInfo?.hasPreviousPage,
                  };
                });
              },
            );
            return json({
              menuData,
              imageData,
              productStartCursor:
                response?.data?.products?.pageInfo?.startCursor,
              productEndCursor: response?.data?.products?.pageInfo?.endCursor,
              productHasNextPage:
                response?.data?.products?.pageInfo?.hasNextPage,
              productHasPreviousPage:
                response?.data?.products?.pageInfo?.hasPreviousPage,
            });
          } else {
            return json({
              menuData: [],
              imageData: [],
              productStartCursor: "",
              productEndCursor: "",
              productHasNextPage: "",
              productHasPreviousPage: "",
            });
          }
        } catch (error) {
          console.error("Error action loadData productImage:", error);
          return json({
            menuData: [],
            imageData: [],
            productStartCursor: "",
            productEndCursor: "",
            productHasNextPage: "",
            productHasPreviousPage: "",
          });
        }
      case !!languageLoading:
        try {
          const mutationResponse = await admin.graphql(
            `query MyQuery {
              shopLocales{
                locale
                name
                primary
                published
              }
            }`,
          );
          const data = await mutationResponse.json();
          return {
            success: true,
            response: data.data.shopLocales,
          };
        } catch (error) {
          console.log("GraphQL Error: ", error);
          return {
            success: false,
            response: null,
          };
        }

      case !!productStartCursor:
        try {
          console.log(productStartCursor);

          const loadData = await admin.graphql(
            `#graphql
              query products($startCursor: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
                products(last: 10 ,before: $startCursor, query: $query, sortKey: $sortKey, reverse: $reverse) {
                  edges {
                  node {
                    id
                    title
                    status
                    images(first: 20) {
                      edges {
                        node {
                          id
                          url
                          altText
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
            {
              variables: {
                startCursor: productStartCursor?.cursor
                  ? productStartCursor?.cursor
                  : undefined,
                query: queryString(productStartCursor),
                sortKey: productStartCursor?.sortKey || "TITLE",
                reverse: productStartCursor?.reverse ?? false,
              },
            },
          );

          const response = await loadData.json();

          console.log("productStartCursor", response?.data?.products?.edges);
          if (response?.data?.products?.edges.length > 0) {
            const menuData = response?.data?.products?.edges.map(
              (item: any) => {
                return {
                  key: item?.node?.id,
                  label: item?.node?.title,
                  imageData: item?.node?.images,
                  status: item?.node?.status,
                };
              },
            );
            const imageData = response?.data?.products?.edges.map(
              (item: any) => {
                return item?.node?.images?.edges.map((image: any) => {
                  return {
                    key: image?.node?.id,
                    altText: image?.node?.altText,
                    productId: item?.node?.id,
                    productTitle: item?.node?.title,
                    imageId: image?.node?.id,
                    imageUrl: image?.node?.url,
                    targetImageUrl: "",
                    imageStartCursor: item?.node?.images?.pageInfo?.startCursor,
                    imageEndCursor: item?.node?.images?.pageInfo?.endCursor,
                    imageHasNextPage: item?.node?.images?.pageInfo?.hasNextPage,
                    imageHasPreviousPage:
                      item?.node?.images?.pageInfo?.hasPreviousPage,
                  };
                });
              },
            );
            return json({
              menuData,
              imageData,
              productStartCursor:
                response?.data?.products?.pageInfo?.startCursor,
              productEndCursor: response?.data?.products?.pageInfo?.endCursor,
              productHasNextPage:
                response?.data?.products?.pageInfo?.hasNextPage,
              productHasPreviousPage:
                response?.data?.products?.pageInfo?.hasPreviousPage,
            });
          } else {
            return json({
              menuData: [],
              imageData: [],
              productStartCursor: "",
              productEndCursor: "",
              productHasNextPage: "",
              productHasPreviousPage: "",
            });
          }
        } catch (error) {
          console.error("Error action productStartCursor productImage:", error);
          return json({
            menuData: [],
            imageData: [],
            productStartCursor: "",
            productEndCursor: "",
            productHasNextPage: "",
            productHasPreviousPage: "",
          });
        }
      case !!productEndCursor:
        try {
          console.log("productEndCursor dasd :",productEndCursor);
          
          const loadData = await admin.graphql(
            `#graphql
              query products($endCursor: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
                products(first: 10, after: $endCursor, query: $query, sortKey: $sortKey, reverse: $reverse) {
                  edges {
                  node {
                    id
                    title
                    status
                    images(first: 20) {
                      edges {
                        node {
                          id
                          url
                          altText
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
            {
              variables: {
                endCursor: productEndCursor?.cursor
                  ? productEndCursor?.cursor
                  : undefined,
                query: queryString(productEndCursor),
                sortKey: productEndCursor?.sortKey || "TITLE",
                reverse: productEndCursor?.reverse ?? false,
              },
            },
          );

          const response = await loadData.json();
          console.log("sdasdasda: ", response);

          console.log("productEndCursor11", response?.data?.products?.edges);
          if (response?.data?.products?.edges.length > 0) {
            const menuData = response?.data?.products?.edges.map(
              (item: any) => {
                return {
                  key: item?.node?.id,
                  label: item?.node?.title,
                  imageData: item?.node?.images,
                  status: item?.node?.status,
                };
              },
            );
            const imageData = response?.data?.products?.edges.map(
              (item: any) => {
                return item?.node?.images?.edges.map((image: any) => {
                  return {
                    key: image?.node?.id,
                    altText: image?.node?.altText,
                    productId: item?.node?.id,
                    productTitle: item?.node?.title,
                    imageId: image?.node?.id,
                    imageUrl: image?.node?.url,
                    targetImageUrl: "",
                    imageStartCursor: item?.node?.images?.pageInfo?.startCursor,
                    imageEndCursor: item?.node?.images?.pageInfo?.endCursor,
                    imageHasNextPage: item?.node?.images?.pageInfo?.hasNextPage,
                    imageHasPreviousPage:
                      item?.node?.images?.pageInfo?.hasPreviousPage,
                  };
                });
              },
            );

            return json({
              menuData,
              imageData,
              productStartCursor:
                response?.data?.products?.pageInfo?.startCursor,
              productEndCursor: response?.data?.products?.pageInfo?.endCursor,
              productHasNextPage:
                response?.data?.products?.pageInfo?.hasNextPage,
              productHasPreviousPage:
                response?.data?.products?.pageInfo?.hasPreviousPage,
            });
          } else {
            return json({
              menuData: [],
              imageData: [],
              productStartCursor: "",
              productEndCursor: "",
              productHasNextPage: "",
              productHasPreviousPage: "",
            });
          }
        } catch (error) {
          console.error("Error action productEndCursor productImage:", error);
          return json({
            menuData: [],
            imageData: [],
            productStartCursor: "",
            productEndCursor: "",
            productHasNextPage: "",
            productHasPreviousPage: "",
          });
        }
      case !!imageStartCursor:
        try {
          const loadData = await admin.graphql(
            `query {
            product(id: "${imageStartCursor?.productId}") {
              id
              title
              images(last: 8, before: "${imageStartCursor?.imageStartCursor}") {
                edges {
                  node {
                    id
                    url
                    altText
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
          }`,
          );

          const response = await loadData.json();

          console.log(
            "imageStartCursor",
            response?.data?.product?.images?.edges,
          );
          if (response?.data?.product?.images?.edges.length > 0) {
            const imageData = response?.data?.product?.images?.edges.map(
              (item: any) => {
                return {
                  key: item?.node?.id,
                  productId: item?.node?.id,
                  productTitle: item?.node?.title,
                  imageId: item?.node?.id,
                  imageUrl: item?.node?.url,
                  targetImageUrl: "",
                  imageStartCursor:
                    response?.data?.product?.images?.pageInfo?.startCursor,
                  imageEndCursor:
                    response?.data?.product?.images?.pageInfo?.endCursor,
                  imageHasNextPage:
                    response?.data?.product?.images?.pageInfo?.hasNextPage,
                  imageHasPreviousPage:
                    response?.data?.product?.images?.pageInfo?.hasPreviousPage,
                };
              },
            );
            return json({
              imageData,
            });
          } else {
            return json({
              imageData: [],
            });
          }
        } catch (error) {
          console.error("Error action imageStartCursor productImage:", error);
          return json({
            imageData: [],
          });
        }
      case !!imageEndCursor:
        try {
          const loadData = await admin.graphql(
            `query {
            product(id: "${imageEndCursor?.productId}") {
              id
              title
              images(first: 8, after: "${imageEndCursor?.imageEndCursor}") {
                edges {
                  node {
                    id
                    url
                    altText
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
          }`,
          );

          const response = await loadData.json();

          console.log("imageEndCursor", response?.data?.product?.images);
          if (response?.data?.product?.images?.edges.length > 0) {
            const imageData = response?.data?.product?.images?.edges.map(
              (item: any) => {
                return {
                  key: item?.node?.id,
                  productId: item?.node?.id,
                  productTitle: item?.node?.title,
                  imageId: item?.node?.id,
                  imageUrl: item?.node?.url,
                  targetImageUrl: "",
                  imageStartCursor:
                    response?.data?.product?.images?.pageInfo?.startCursor,
                  imageEndCursor:
                    response?.data?.product?.images?.pageInfo?.endCursor,
                  imageHasNextPage:
                    response?.data?.product?.images?.pageInfo?.hasNextPage,
                  imageHasPreviousPage:
                    response?.data?.product?.images?.pageInfo?.hasPreviousPage,
                };
              },
            );
            return json({
              imageData,
            });
          } else {
            return json({
              imageData: [],
            });
          }
        } catch (error) {
          console.error("Error action imageEndCursor productImage:", error);
          return json({
            imageData: [],
          });
        }
    }

    return {
      success: false,
      message: "Invalid data",
    };
  } catch (error) {
    console.log("Error management action: ", error);
    return { error: "Error management action", status: 500, errorMsg: error };
  }
};

// export default function Index() {
//   return <Page>1111</Page>;
// }
