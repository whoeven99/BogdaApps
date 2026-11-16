import axios from "axios";
import { queryShop } from "~/api/admin.server";

/** Init Java user row. Do not send Shopify tokens. Failures must not block the UI. */
export async function UserAdd({ shop }: { shop: string }) {
  try {
    const shopData = await queryShop({ shop });
    const shopOwnerName = shopData?.shopOwnerName || "";
    const lastSpaceIndex = shopOwnerName.lastIndexOf(" ");
    const firstName =
      lastSpaceIndex >= 0 ? shopOwnerName.substring(0, lastSpaceIndex) : shopOwnerName;
    const lastName = lastSpaceIndex >= 0 ? shopOwnerName.substring(lastSpaceIndex + 1) : "";
    const addUserInfoResponse = await axios({
      url: `${process.env.SERVER_URL}/pcUsers/initUser?shopName=${shop}`,
      method: "POST",
      timeout: 10000,
      data: {
        email: shopData?.email || "",
        phone: "",
        realAddress: "",
        ipAddress: "",
        firstName: firstName || "",
        lastName: lastName || "",
        userTag: shopOwnerName || "",
      },
    });
    console.log(`${shop} addUserInfoResponse: `, addUserInfoResponse.data);
    return addUserInfoResponse.data;
  } catch (error) {
    console.error(`${shop} Error UserAdd:`, error);
    return null;
  }
}
