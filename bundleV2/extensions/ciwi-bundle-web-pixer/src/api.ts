export const WebpixerToAli = async ({
  server,
  event,
  shopName,
  clientId,
  productId,
  extra,
}: {
  server: string;
  event: string;
  shopName: string;
  clientId: string;
  productId?: string;
  extra: string;
}) => {
  console.log("[web-pixel] WebpixerToAli", {
    shopName,
    event,
  });

  try {
    const response = await fetch(`${server}/webpixerToAli`, {
      method: "POST",
      // Keep this a "simple request" to avoid browser preflight (OPTIONS)
      // in storefront contexts where upstream proxies may not pass CORS headers.
      body: JSON.stringify({
        event,
        shopName,
        productId: productId || "",
        clientId,
        extra,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `webpixerToAli request failed: ${response.status} ${response.statusText} ${errorText}`
      );
    }
  } catch (error) {
    console.error(`${shopName} Error WebpixerToAli: `, error);
  }
};
