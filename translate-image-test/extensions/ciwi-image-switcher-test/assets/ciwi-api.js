export function switchUrl(blockId) {
  if (blockId === "AZnlHVkxkZDMwNDg2Q__13411448604249213220") {
    return "https://springbackendprod.azurewebsites.net";
  } else {
    return "https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net";
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export async function GetProductImageData({
  blockId,
  shopName,
  productId,
  languageCode,
}) {
  try {
    const { data } = await fetchJson(
      `${switchUrl(blockId)}/picture/getPictureDataByShopNameAndResourceIdAndPictureId?shopName=${shopName}`,
      {
        method: "POST",
        body: JSON.stringify({
          shopName,
          imageId: `gid://shopify/Product/${productId}`,
          languageCode,
        }),
      },
    );
    return data;
  } catch (err) {
    console.error("Error GetProductImageData:", err);
  }
}

export async function GetShopImageData({ shopName, languageCode,blockId }) {
  try {
    const { data } = await fetchJson(
      `${switchUrl(blockId)}/picture/getPictureDataByShopNameAndLanguageCode?shopName=${shopName}&languageCode=${languageCode}`,
      {
        method: "POST",
      },
    );
    return data;
  } catch (err) {
    console.error(`${shop} Error GetProductImageData:`, err);
  }
}

export async function CrawlerDDetectionReport({ shop, blockId, ua, reason }) {
  try {
    const { data } = await fetchJson(`${switchUrl(blockId)}/frontEndPrinting`, {
      method: "POST",
      body: JSON.stringify({
        data: `${shop} 检测到爬虫 ${ua}, 原因: ${reason}`,
      }),
    });
    return data;
  } catch (err) {
    console.error("Error CrawlerDDetectionReport:", err);
  }
}