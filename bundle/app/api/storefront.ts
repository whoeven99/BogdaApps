import axios from "axios";

export const QueryStorefrontProducts = async ({
    shop,
    storefrontAccessToken,
    startCursor,
    endCursor,
}: {
    shop: string;
    storefrontAccessToken: string;
    startCursor?: string;
    endCursor?: string;
}) => {
    try {
        const pagination = endCursor
            ? `first: 50, after: "${endCursor}"`
            : startCursor
                ? `last: 50, before: "${startCursor}"`
                : `first: 50`;

        const gql = `
            {
                products(${pagination}) {
                    nodes {
                        id
                        title
                        availableForSale
                        featuredImage {
                            url
                            altText
                        }
                        variants(first: 250) {
                            nodes {
                                id
                                availableForSale
                                image {
                                    url
                                    altText
                                }
                                price {
                                    amount
                                    currencyCode
                                }
                                compareAtPrice {
                                    amount
                                    currencyCode
                                }
                                selectedOptions {
                                    name
                                    value
                                }
                            }
                        }
                        options(first: 50) {
                            name
                            optionValues {
                                name
                                id
                                swatch {
                                    color
                                }
                            }
                        }
                    }
                    pageInfo {
                        endCursor
                        hasNextPage
                        hasPreviousPage
                        startCursor
                    }
                }
            }
        `;

        const { data } = await axios.post(
            `https://${shop}/api/2025-10/graphql.json`,
            {
                query: gql,
            },
            {
                headers: {
                    "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
                    "Content-Type": "application/json",
                },
            }
        );

        const res = data?.data;

        console.log(`${shop} queryStorefrontProducts:`, res);

        return res;
    } catch (error) {
        console.error(`${shop} Error queryStorefrontProducts:`, error);
        return null;
    }
};