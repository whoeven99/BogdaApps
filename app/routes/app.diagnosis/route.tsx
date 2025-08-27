"use client";
import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, json } from "@remix-run/react";
import { Page, Button, Modal, Text, Banner } from "@shopify/polaris";
import { createApp } from "@shopify/app-bridge";
import crypto from "crypto";
import { authenticate } from "../../shopify.server";
import { type ActionFunctionArgs } from "@remix-run/node";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-07";
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
export const loader = async ({ request }: any) => {
  try {
    await shopify.scopes.revoke(["read_orders"]);
    const { session } = await authenticate.admin(request);
    const apiKey = process.env.SHOPIFY_API_KEY!;
    const appUrl = process.env.SHOPIFY_APP_URL!;
    const shop = session?.shop || "ciwishop.myshopify.com";
    const client_id = process.env.SHOPIFY_API_KEY;
    const host = Buffer.from(shop).toString("base64");
    console.log("Session", session);
    console.log("amodajdoako");

    // 当前权限
    const currentScopes = session.scope ? session.scope.split(",") : [];
    // 需要的权限
    const REQUESTED_SCOPES = process.env.OPTIONAL_SCOPES;
    console.log("assa", REQUESTED_SCOPES?.split(","));

    const missingScopes =
      REQUESTED_SCOPES?.split(",").filter((s) => !currentScopes.includes(s)) ||
      [];
    const hasRequiredScopes = missingScopes.length === 0;
    // 如果缺少权限，生成增量 OAuth URL
    let installUrl: string | null = null;
    if (!hasRequiredScopes) {
      installUrl = `https://admin.shopify.com/store/${shop}/oauth/install?client_id=${client_id}&optional_scopes=${REQUESTED_SCOPES}`;
    }

    return { shop, host, apiKey, appUrl, hasRequiredScopes, installUrl };
  } catch (err) {
    console.error(err);
    return { shop: null, hasRequiredScopes: false, installUrl: null };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const formData = await request.formData();
    const handleOAuthorizeFetcher = formData.get("handleOAuthorizeFetcher")
      ? JSON.parse(formData.get("handleOAuthorizeFetcher") as string)
      : null;
    const loadingFetcher = formData.get("loadingFetcher")
      ? JSON.parse(formData.get("loadingFetcher") as string)
      : null;
    switch (true) {
      case !!loadingFetcher:
        // const { session } = await authenticate.admin(request);
        // 构建 REST 客户端
        try {
          const { admin } = await authenticate.admin(request);
          const response = await admin.graphql(
            `#graphql
            query suggestedRefund {
              order(id: "gid://shopify/Order/469306983") {
                suggestedRefund(refundDuties: [{dutyId: "gid://shopify/Duty/1064114503", refundType: FULL}]) {
                  refundDuties {
                    amountSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    originalDuty {
                      id
                    }
                  }
                  totalDutiesSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }`,
          );

          const data = await response.json();
          console.log("datassss", data);

          return json({ orders: data });
        } catch (error) {
          return json({ error: "没有获取到数据" });
        }
      case !!handleOAuthorizeFetcher:
        if (handleOAuthorizeFetcher.opportunity === "init") {
          console.log("处理授权请求");
          console.log("action session", session);
          // const { session } = await authenticate.oauth.callback(request);
          console.log("New Session:", session);
          return json({ result: { message: "授权请求处理成功" } });
        }
        return json({ error: "无效的 opportunity 参数" }, { status: 400 });

      // 示例：处理其他类型的请求（可扩展）
      case formData.has("otherRequest"):
        const otherRequest = JSON.parse(formData.get("otherRequest") as string);
        console.log("处理其他请求:", otherRequest);
        return json({
          result: { message: "其他请求处理成功", data: otherRequest },
        });

      // 示例：处理 OAuth 回调（如果需要）
      case request.method === "GET" &&
        new URL(request.url).searchParams.has("code"):
        console.log("处理 OAuth 回调");
        return json({ result: { message: "OAuth 回调处理" } });

      default:
        return json({ error: "无效的请求数据" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Action 错误:", error);
    return json({ error: "处理请求时出错" }, { status: 400 });
  }
};

export default function Demo() {
  const { shop, apiKey, host, hasRequiredScopes, installUrl } =
    useLoaderData<typeof loader>();
  const oAuthorizeFetcher = useFetcher<any>();
  const loadingFetcher = useFetcher<any>();
  console.log("hasRequiredScopes", hasRequiredScopes);

  const [showModal, setShowModal] = useState(!hasRequiredScopes);
  const [RequiredScopes, setRequiredScopes] = useState(hasRequiredScopes);
  const { t } = useTranslation();
  const handleAuthorize = async () => {
    try {
      const response = await shopify.scopes.request(["read_orders"]);
      console.log("scope response", response);
      if (response.result === "granted-all") {
        console.log(response.detail.granted);
        setRequiredScopes(true);
      }
      oAuthorizeFetcher.submit(
        {
          handleOAuthorizeFetcher: JSON.stringify({
            opportunity: "init",
          }),
        },
        {
          method: "POST",
          action: "/app/diagnosis",
        },
      );

      const { granted } = await shopify.scopes.query();
      console.log("exit", granted);

      //   const app = createApp({ apiKey, host });
      const targetUrl = installUrl!;
      console.log(targetUrl);

      // if (window.top) {
      //   window.top.location.href = targetUrl;
      // } else {
      //   window.location.href = targetUrl;
      // }
    } catch (err) {
      console.error("Authorize error:", err);
    }
  };

  useEffect(() => {
    (async () => {
      loadingFetcher.submit(
        { loading: JSON.stringify(null) }, // 修改为可序列化的值
        { method: "POST", action: "/app/diagnosis" },
      );
      
    })();
  }, []);

  useEffect(() => {
    if (loadingFetcher.data) {
      console.log(loadingFetcher);
    }
  }, [loadingFetcher]);

  useEffect(() => {
    console.log();
    if (oAuthorizeFetcher.data) {
      console.log(oAuthorizeFetcher.data.result.message);
    }
  }, [oAuthorizeFetcher]);
  const handleAction = () => {
    console.log(`操作执行成功！当前店铺: ${shop}`);
  };
  const handleTest = () => {
    console.log("Test button clicked");
  };
  return (
    <Page title="增量权限 Demo">
      <TitleBar title={t("权限增量")} />
      {!RequiredScopes && (
        <Banner title={t("缺少权限")} tone="warning">
          <p>{t("需要授权访问订单和产品权限才能继续操作。")}</p>
        </Banner>
      )}
      <Button
        variant="primary"
        onClick={handleAction}
        disabled={!RequiredScopes}
      >
        执行操作
      </Button>
      <button onClick={handleTest}>ceshibug</button>
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="需要额外权限"
        primaryAction={{
          content: "授权权限",
          onAction: () => {
            handleAuthorize();
            setShowModal(false);
          },
        }}
        secondaryActions={[
          {
            content: "取消",
            onAction: () => setShowModal(false),
          },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            应用需要访问您的订单和产品数据。请授权以继续使用功能。
          </Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
