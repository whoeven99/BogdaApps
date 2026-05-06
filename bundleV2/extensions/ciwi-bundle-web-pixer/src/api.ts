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
    server: server || "(empty)",
  });

  try {
    const endpoint = `${server}/webpixerToAli`;
    console.log("[web-pixel] WebpixerToAli request", {
      endpoint,
      event,
      shopName,
      productId: productId || "",
      clientId: clientId || "",
      extraLength: extra.length,
    });
    const response = await fetch(endpoint, {
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

    const responseText = await response.text().catch(() => "");
    const responsePreview = responseText.slice(0, 320).replace(/\s+/g, " ");
    console.log("[web-pixel] WebpixerToAli response", {
      endpoint,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      bodyPreview: responsePreview,
    });
    if (!response.ok) {
      throw new Error(
        `webpixerToAli request failed: ${response.status} ${response.statusText} ${responsePreview}`
      );
    }
  } catch (error) {
    console.error(`${shopName} Error WebpixerToAli: `, error);
  }
};
