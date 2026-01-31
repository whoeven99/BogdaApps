export const WebpixerToAli = async ({
    server,
    event,
    shopName,
    clientId,
    extra,
}: {
    server: string,
    event: string,
    shopName: string,
    clientId: string,
    extra: string,
}) => {
    try {
        await fetch(`${server}/webpixerToAli`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event,
                shopName,
                clientId,
                extra,
            }),
        })
    } catch (error) {
        console.error(`${shopName} Error WebpixerToAli: `, error)
    }
}
