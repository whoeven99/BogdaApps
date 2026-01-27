export const ProductViewOrAddToCart = async ({
    event,
    shopName,
    productId,
    clientId,
    extra,
}: {
    event: string,
    shopName: string,
    productId: string,
    clientId: string,
    extra: any,
}) => {
    try {
        await fetch('https://d7dcb9c460e4.ngrok.app/productViewOrAddToCart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event,
                shopName,
                productId,
                clientId,
                extra,
            }),
        })
    } catch (error) {
        console.error(`${shopName} Error ProductView: `, error)
    }
}
