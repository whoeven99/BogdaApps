import axios from "axios";

//查询markets数据
export const queryMarkets = async ({
    shop,
    accessToken,
}: {
    shop: string;
    accessToken: string;
}) => {
    try {
        const gql = `
            {
                markets(first: 250) {
                    nodes {
                        id
                        name
                    }
                }
            }
            `;

        const { data } = await axios.post(
            `https://${shop}/admin/api/${process.env.GRAPHQL_VERSION}/graphql.json`,
            { query: gql },
            {
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                },
            }
        );

        const res = data?.data;

        console.log(`${shop} queryMarkets:`, res);

        return res;
    } catch (error: any) {
        console.error(`${shop} Error queryMarkets:`, error?.response?.data);
        return null;
    }
};

//查询product variants数据
export const queryProductVariants = async ({
    shop,
    accessToken,
    query,
    startCursor,
    endCursor,
}: {
    shop: string;
    accessToken: string;
    query: string;
    startCursor?: string;
    endCursor?: string;
}) => {
    try {
        const pagination = endCursor
            ? `first: 20, after: "${endCursor}"`
            : startCursor
                ? `last: 20, before: "${startCursor}"`
                : `first: 20`;

        const gql = `
            {
                productVariants(
                    reverse: true,
                    query: "${query}",
                    ${pagination}
                ) {
                    nodes {
                        id
                        title
                        price
                        media(first: 1) {
                            edges {
                                node {
                                    preview {
                                        image {
                                            url
                                        }
                                    }
                                }
                            }
                        }
                        product {
                            title
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
            `;

        const { data } = await axios.post(
            `https://${shop}/admin/api/${process.env.GRAPHQL_VERSION}/graphql.json`,
            { query: gql },
            {
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                },
            }
        );

        const res = data?.data;

        console.log(`${shop} queryProductVariants:`, res);

        return res;
    } catch (error: any) {
        console.error(`${shop} Error queryProductVariants:`, error?.response?.data);
        return null;
    }
};

//查询customer segments数据
export const querySegments = async ({
    shop,
    accessToken,
    query,
    startCursor,
    endCursor,
}: {
    shop: string;
    accessToken: string;
    query: string;
    startCursor?: string;
    endCursor?: string;
}) => {
    try {
        const pagination = endCursor
            ? `first: 20, after: "${endCursor}"`
            : startCursor
                ? `last: 20, before: "${startCursor}"`
                : `first: 20`;

        const gql = `
            {
                segments(
                    query: "${query}",
                    ${pagination}
                ) {
                    nodes {
                        creationDate
                        id
                        lastEditDate
                        name
                        query
                    }
                }
            }
            `;

        const { data } = await axios.post(
            `https://${shop}/admin/api/${process.env.GRAPHQL_VERSION}/graphql.json`,
            { query: gql },
            {
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                },
            }
        );

        const res = data?.data;

        console.log(`${shop} querySegments:`, res);

        return res;
    } catch (error: any) {
        console.error(`${shop} Error querySegments: `, error?.response?.data);
        return null;
    }
};

//查询customers数据，目前不能正常生效
export const queryCustomers = async ({
    shop,
    accessToken,
    query,
    startCursor,
    endCursor,
}: {
    shop: string;
    accessToken: string;
    query: string;
    startCursor?: string;
    endCursor?: string;
}) => {
    try {
        const pagination = endCursor
            ? `first: 20, after: "${endCursor}"`
            : startCursor
                ? `last: 20, before: "${startCursor}"`
                : `first: 20`;

        const gql = `
            {
                customers(
                    query: "${query}",
                    ${pagination}
                ) {
                    nodes {
                        id
                        firstName
                        lastName
                        defaultEmailAddress {
                            emailAddress
                        }
                    }
                }
            }
            `;

        console.log(`${shop} queryCustomers gql:`, gql);


        const { data } = await axios.post(
            `https://${shop}/admin/api/${process.env.GRAPHQL_VERSION}/graphql.json`,
            { query: gql },
            {
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                },
            }
        );

        const res = data?.data;

        console.log(`${shop} queryCustomers:`, res);

        return res;
    } catch (error: any) {
        console.error(`${shop} Error queryCustomers: `, error?.response?.data);
        return null;
    }
};

//创建折扣计划
export const mutationDiscountAutomaticAppCreateAndMetafieldsSet = async ({
    shop,
    accessToken,
    variables
}: {
    shop: string;
    accessToken: string;
    variables: any;
}) => {
    try {
        const gql = `
            mutation discountAutomaticAppCreateAndMetafieldsSet($automaticAppDiscount: DiscountAutomaticAppInput!, $metafields: [MetafieldsSetInput!]!) {
                discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
                    userErrors {
                        field
                        message
                    }
                    automaticAppDiscount {
                        discountId
                        title
                        startsAt
                        endsAt
                        status
                        combinesWith {
                            orderDiscounts
                            productDiscounts
                            shippingDiscounts
                        }
                        discountClasses
                    }
                }
                metafieldsSet(metafields: $metafields) {
                    userErrors {
                        field
                        message
                        code
                    } 
                    metafields {
                        key
                        namespace
                        value
                        createdAt
                        updatedAt
                    }  
                }
            }
            `;

        console.log(`${shop} mutationDiscountAutomaticAppCreateAndMetafieldsSet gql:`, gql);

        const { data } = await axios.post(
            `https://${shop}/admin/api/${process.env.GRAPHQL_VERSION}/graphql.json`,
            { query: gql, variables },
            {
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                },
            }
        );

        const res = data?.data;

        console.log(`${shop} mutationDiscountAutomaticAppCreateAndMetafieldsSet:`, data);

        if (res?.discountAutomaticAppCreate?.userErrors?.length > 0) {
            console.error(`${shop} Error mutationDiscountAutomaticAppCreate:`, res?.discountAutomaticAppCreate?.userErrors);
            return null;
        }

        if (res?.metafieldsSet?.userErrors?.length > 0) {
            console.error(`${shop} Error mutationMetafieldsSet:`, res?.metafieldsSet?.userErrors);
            return null;
        }

        return res;
    } catch (error: any) {
        console.error(`${shop} Error mutationDiscountAutomaticAppCreateAndMetafieldsSet error: `, error?.response?.data);
        return null;
    }
}