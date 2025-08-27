import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { authenticate } from "../../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin }:any = await authenticate.admin(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    try {
      // 验证 state（可选，防止 CSRF）
      // 这里假设 state 已通过 loader 生成并验证，此处简化处理

      const tokenResponse = await admin.rest.post("/oauth/access_token", {
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
        grant_type: "authorization_code",
      });

      const accessToken = tokenResponse.data.access_token;
      session.accessToken = accessToken;
      await session.save();
      console.log("Access token saved:", accessToken);
    } catch (error:any) {
      console.error("OAuth error:", error.response?.data || error.message);
      throw new Response("Authorization failed", { status: 400 });
    }
  } else {
    throw new Response("Invalid OAuth callback", { status: 400 });
  }

  return redirect("/diagnosis");
};

export default function Callback() {
  return null; // 无需渲染内容
}