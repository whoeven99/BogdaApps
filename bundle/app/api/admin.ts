import axios from "axios";

//查询当前商店的折扣
export const queryDiscountNodes = async ({
    shop,
    accessToken,
}: {
    shop: string;
    accessToken: string;
}) => {
    try {
        const gql = `{
            discountNodes(
                first: 100, 
                query: "appDiscountType.app.handle:${process.env.SHOPIFY_APP_HANDLE}",
                reverse: true
            ) {
                nodes {
                    id
                    discount {
                        ... on DiscountAutomaticApp {
                            status
                            title
                        }
                    }
                }
            }
        }`;

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

        console.log(`${shop} queryDiscountNodes: `, res);

        return res;
    } catch (error) {
        console.error(`${shop} Error queryDiscountNodes: `, error);
        return null;
    }
};

//查询已发布主题数据
export const queryThemes = async ({
    shop,
    accessToken,
}: {
    shop: string;
    accessToken: string;
}) => {
    try {
        const gql = `{
            themes(roles: MAIN, first: 1) {
                nodes {
                    files(filenames: "config/settings_data.json") {
                        nodes {
                            body {
                                ... on OnlineStoreThemeFileBodyText {
                                __typename
                                content
                                }
                            }
                        }
                    }
                }
            }
        }`;

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

        console.log(`${shop} queryThemes: `, res);

        return res;
    } catch (error) {
        console.error(`${shop} Error queryThemes: `, error);
        return null;
    }
};

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
            ? `first: 50, after: "${endCursor}"`
            : startCursor
                ? `last: 50, before: "${startCursor}"`
                : `first: 50`;

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
            ? `first: 50, after: "${endCursor}"`
            : startCursor
                ? `last: 50, before: "${startCursor}"`
                : `first: 50`;

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

//删除折扣计划
export const mutationDiscountAutomaticDeleteAndMetafieldsDelete = async ({
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
            mutation discountAutomaticDeleteAndMetafieldsDelete($id: ID!, $metafields: [MetafieldsSetInput!]!) {
                discountAutomaticDelete(id: $id) {
                    deletedAutomaticDiscountId
                    userErrors {
                        field
                        code
                        message
                    }
                }
                metafieldsDelete(metafields: $metafields) {
                    deletedMetafields {
                      key
                      namespace
                      ownerId
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
            `;

        console.log(`${shop} mutationDiscountAutomaticDeleteAndMetafieldsDelete gql:`, gql);

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

        console.log(`${shop} mutationDiscountAutomaticDeleteAndMetafieldsDelete:`, data);

        if (res?.discountAutomaticDelete?.userErrors?.length > 0) {
            console.error(`${shop} Error mutationDiscountAutomaticDelete:`, res?.discountAutomaticDelete?.userErrors);
            return null;
        }

        if (res?.metafieldsDelete?.userErrors?.length > 0) {
            console.error(`${shop} Error mutationMetafieldsDelete:`, res?.metafieldsDelete?.userErrors);
            return null;
        }

        return res;
    } catch (error: any) {
        console.error(`${shop} Error mutationDiscountAutomaticDeleteAndMetafieldsDelete error: `, error?.response?.data);
        return null;
    }
}

//激活折扣计划
export const mutationDiscountAutomaticActivate = async ({
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
            mutation discountAutomaticActivate($id: ID!) {
                discountAutomaticActivate(id: $id) {
                    automaticDiscountNode {
                        automaticDiscount {
                            ... on DiscountAutomaticApp {
                                status
                                startsAt
                                endsAt
                            }   
                        }
                        id
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
            `;

        console.log(`${shop} mutationDiscountAutomaticActivate gql:`, gql);

        const { data } = await axios.post(
            `https://${shop}/admin/api/${process.env.GRAPHQL_VERSION}/graphql.json`,
            { query: gql, variables },
            {
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                },
            }
        );

        const res = data?.data?.discountAutomaticActivate;

        console.log(`${shop} mutationDiscountAutomaticActivate:`, data);

        if (res?.userErrors?.length > 0) {
            console.error(`${shop} Error mutationDiscountAutomaticActivate:`, res?.userErrors);
            return null;
        }

        return res;
    } catch (error: any) {
        console.error(`${shop} Error mutationDiscountAutomaticActivate error: `, error?.response?.data);
        return null;
    }
}

//停用折扣计划
export const mutationDiscountAutomaticDeactivate = async ({
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
            mutation discountAutomaticDeactivate($id: ID!) {
                discountAutomaticDeactivate(id: $id) {
                    automaticDiscountNode {
                        automaticDiscount {
                            ... on DiscountAutomaticApp {
                                status
                                startsAt
                                endsAt
                            }
                        }
                        id
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
            `;

        console.log(`${shop} mutationDiscountAutomaticDeactivate gql:`, gql);

        const { data } = await axios.post(
            `https://${shop}/admin/api/${process.env.GRAPHQL_VERSION}/graphql.json`,
            { query: gql, variables },
            {
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                },
            }
        );

        const res = data?.data?.discountAutomaticDeactivate;

        console.log(`${shop} mutationDiscountAutomaticDeactivate:`, data);

        if (res?.userErrors?.length > 0) {
            console.error(`${shop} Error mutationDiscountAutomaticDeactivate:`, res?.userErrors);
            return null;
        }

        return res;
    } catch (error: any) {
        console.error(`${shop} Error mutationDiscountAutomaticDeactivate error: `, error?.response?.data);
        return null;
    }
}