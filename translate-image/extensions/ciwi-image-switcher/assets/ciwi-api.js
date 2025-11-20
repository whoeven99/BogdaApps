export function switchUrl(blockId) {
  if (blockId === "AZXdIQ0pzK2ZsWlZqW__17209211813463636621") {
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
  id,
  languageCode,
}) {
  try {
    const { data } = await fetchJson(
      `${switchUrl(blockId)}/pcUserPic/selectPictureDataByShopNameAndProductIdAndLanguageCode?shopName=${shopName}`,
      {
        method: "POST",
        body: JSON.stringify({
          productId: id,
          languageCode,
        }),
      },
    );
    console.log("产品后端返回数据", data);

    return data;
  } catch (err) {
    console.error("Error GetProductImageData:", err);
  }
}

export async function GetShopImageData({ shopName, languageCode, blockId }) {
  try {
    const { data } = await fetchJson(
      `${switchUrl(blockId)}/pcUserPic/selectPicturesByShopNameAndLanguageCode?shopName=${shopName}&languageCode=${languageCode}`,
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
