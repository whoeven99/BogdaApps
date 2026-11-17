/** 嵌入页图译客户端：打本 App API，不经 Java COS。 */

export async function UploadProductImage(args: {
  shopName: string;
  imageId: string;
  imageUrl: string;
  languageCode: string;
  file: Blob;
  altBeforeTranslation?: string;
  altAfterTranslation?: string;
}) {
  try {
    const form = new FormData();
    form.append("shopName", args.shopName);
    form.append(
      "userPicturesDoJson",
      JSON.stringify({
        shopName: args.shopName,
        imageId: args.imageId,
        imageBeforeUrl: args.imageUrl,
        altBeforeTranslation: args.altBeforeTranslation ?? "",
        altAfterTranslation: args.altAfterTranslation ?? "",
        languageCode: args.languageCode,
      }),
    );
    form.append("file", args.file);
    const res = await fetch("/api/picture/upload", {
      method: "POST",
      body: form,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      return { success: false, errorCode: res.status, errorMsg: "AUTH_REDIRECT", response: undefined };
    }
    if (!res.ok) {
      return { success: false, errorCode: res.status, errorMsg: "SERVER_ERROR", response: undefined };
    }
    return await res.json();
  } catch (error) {
    console.error("Error UploadProductImage:", error);
    return { success: false, errorCode: 10001, errorMsg: "SERVER_ERROR", response: undefined };
  }
}

export async function DeleteProductImageLocal(args: {
  shopName: string;
  imageId: string;
  imageUrl: string;
  languageCode: string;
}) {
  try {
    const res = await fetch("/api/picture/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopName: args.shopName,
        imageId: args.imageId,
        imageBeforeUrl: args.imageUrl,
        languageCode: args.languageCode,
      }),
    });
    if (!res.ok) {
      return { success: false, errorCode: res.status, errorMsg: "SERVER_ERROR", response: undefined };
    }
    return await res.json();
  } catch (error) {
    console.error("Error DeleteProductImageLocal:", error);
    return { success: false, errorCode: 10001, errorMsg: "SERVER_ERROR", response: undefined };
  }
}

export async function fetchLocalQuota() {
  try {
    const res = await fetch("/api/billing/quota");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
