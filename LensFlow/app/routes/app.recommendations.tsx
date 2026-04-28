import type { LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";

import { recommendProductsForEyeExam } from "../../src/services/prescriptionRecommendations.js";
import type { EyeExamInput } from "../../src/types/prescription.js";
import { authenticate } from "../shopify.server";
import {
  fetchShopifyProducts,
  toRecommendableProduct,
} from "../services/shopify-products.server";

function parseNumber(value: string | null): number | undefined {
  if (!value || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseExamInput(url: URL): EyeExamInput {
  const prescriptionType = url.searchParams.get("prescriptionType");

  return {
    prescriptionType:
      prescriptionType === "non_prescription" ||
      prescriptionType === "single_vision" ||
      prescriptionType === "progressive" ||
      prescriptionType === "reading"
        ? prescriptionType
        : undefined,
    leftEye: {
      sphere: parseNumber(url.searchParams.get("leftSphere")),
      cylinder: parseNumber(url.searchParams.get("leftCylinder")),
      axis: parseNumber(url.searchParams.get("leftAxis")),
    },
    rightEye: {
      sphere: parseNumber(url.searchParams.get("rightSphere")),
      cylinder: parseNumber(url.searchParams.get("rightCylinder")),
      axis: parseNumber(url.searchParams.get("rightAxis")),
    },
    addPower: parseNumber(url.searchParams.get("addPower")),
    pd: parseNumber(url.searchParams.get("pd")),
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const examInput = parseExamInput(url);
  const products = await fetchShopifyProducts(admin, 50);

  return {
    examInput,
    result: recommendProductsForEyeExam(
      products.map(toRecommendableProduct),
      examInput,
    ),
  };
};

export default function RecommendationsPage() {
  const { examInput, result } = useLoaderData<typeof loader>();

  return (
    <s-page heading="配镜推荐">
      <s-section heading="输入验光结果">
        <Form method="get">
          <s-stack direction="block" gap="base">
            <s-select
              name="prescriptionType"
              label="处方类型"
              value={examInput.prescriptionType ?? ""}
            >
              <s-option value="">自动判断</s-option>
              <s-option value="non_prescription">non_prescription</s-option>
              <s-option value="single_vision">single_vision</s-option>
              <s-option value="progressive">progressive</s-option>
              <s-option value="reading">reading</s-option>
            </s-select>
            <s-stack direction="inline" gap="base">
              <s-number-field
                name="leftSphere"
                label="左眼 SPH"
                value={String(examInput.leftEye?.sphere ?? "")}
              />
              <s-number-field
                name="leftCylinder"
                label="左眼 CYL"
                value={String(examInput.leftEye?.cylinder ?? "")}
              />
              <s-number-field
                name="leftAxis"
                label="左眼 AXIS"
                value={String(examInput.leftEye?.axis ?? "")}
              />
            </s-stack>
            <s-stack direction="inline" gap="base">
              <s-number-field
                name="rightSphere"
                label="右眼 SPH"
                value={String(examInput.rightEye?.sphere ?? "")}
              />
              <s-number-field
                name="rightCylinder"
                label="右眼 CYL"
                value={String(examInput.rightEye?.cylinder ?? "")}
              />
              <s-number-field
                name="rightAxis"
                label="右眼 AXIS"
                value={String(examInput.rightEye?.axis ?? "")}
              />
            </s-stack>
            <s-stack direction="inline" gap="base">
              <s-number-field
                name="addPower"
                label="ADD"
                value={String(examInput.addPower ?? "")}
              />
              <s-number-field
                name="pd"
                label="PD"
                value={String(examInput.pd ?? "")}
              />
            </s-stack>
            <s-button type="submit" variant="primary">
              开始匹配商品
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="匹配结果">
        <s-stack direction="block" gap="base">
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>系统判断</s-heading>
            <s-paragraph>
              当前处方类型：
              <s-badge tone="success">{result.exam.prescriptionType}</s-badge>
            </s-paragraph>
            {result.summaryMessages.length > 0 && (
              <s-unordered-list>
                {result.summaryMessages.map((message) => (
                  <s-list-item key={message}>{message}</s-list-item>
                ))}
              </s-unordered-list>
            )}
          </s-box>

          {result.recommendations.length === 0 ? (
            <s-banner tone="warning" heading="暂无匹配商品">
              当前店铺还没有与该验光结果匹配的商品，请先补充支持对应处方类型的商品配置。
            </s-banner>
          ) : (
            result.recommendations.map((item) => (
              <s-box key={item.productId} padding="base" border="base" border-radius="base">
                <s-heading>{item.title}</s-heading>
                <s-paragraph>
                  处方类型：<s-text>{item.prescriptionType}</s-text>
                </s-paragraph>
                <s-paragraph>
                  建议镜片等级：
                  <s-badge tone={item.recommendedLensTier === "high_index" ? "warning" : "success"}>
                    {item.recommendedLensTier === "high_index" ? "高折射率/超薄" : "标准镜片"}
                  </s-badge>
                </s-paragraph>
                <s-paragraph>匹配分数：{item.score}</s-paragraph>
                <s-paragraph>
                  商品链接：
                  <s-link href={`/products/${item.handle}`} target="_blank">
                    {item.handle}
                  </s-link>
                </s-paragraph>
                <s-paragraph>
                  可选镜片：{item.lensOptions.map((option) => option.name).join(" / ") || "未配置"}
                </s-paragraph>
                <s-unordered-list>
                  {item.reasons.map((reason) => (
                    <s-list-item key={reason}>{reason}</s-list-item>
                  ))}
                </s-unordered-list>
              </s-box>
            ))
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}
