export const ProductViewReport = ({
    topic,
    shopName,
    bundleId,
    productId,
    clientId
}: {
    topic: string,
    shopName: string,
    bundleId: string,
    productId: string,
    clientId: string
}) => {
    console.log("ProductViewReport: ", {
        topic,
        shopName,
        bundleId,
        productId,
        clientId
    });
}

export const ProductAddToCartReport = ({
    topic,
    shopName,
    bundleId,
    productId,
    clientId
}: {
    topic: string,
    shopName: string,
    bundleId: string,
    productId: string,
    clientId: string
}) => {
    console.log("ProductAddToCartReport: ", {
        topic,
        shopName,
        bundleId,
        productId,
        clientId
    });
}

export const CheckoutStartedReport = ({
    topic,
    shopName,
    bundleId,
    productId,
    clientId
}: {
    topic: string,
    shopName: string,
    bundleId: string,
    productId: string,
    clientId: string
}) => {
    console.log("CheckoutStartedReport: ", {
        topic,
        shopName,
        bundleId,
        productId,
        clientId
    });
}

export const CheckoutCompletedReport = ({
    topic,
    shopName,
    bundleId,
    productId,
    clientId
}: {
    topic: string,
    shopName: string,
    bundleId: string,
    productId: string,
    clientId: string
}) => {
    console.log("CheckoutCompletedReport: ", {
        topic,
        shopName,
        bundleId,
        productId,
        clientId
    });
}
