import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import { parseParameterDefinitionsJson } from "../../src/lib/product-parameters.js";
import { authenticate } from "../shopify.server";
import {
  ensureDefaultParameterTemplates,
  listParameterTemplates,
  listParameterUnits,
  saveParameterTemplate,
} from "../models/product-parameters.server";

const SAMPLE_PARAMETERS_JSON = JSON.stringify(
  [
    {
      code: "blue_light_level",
      label: "防蓝光等级",
      type: "select",
      required: false,
      position: 10,
      options: ["standard", "plus", "max"],
    },
    {
      code: "edge_thickness",
      label: "边厚等级",
      type: "number",
      required: false,
      position: 20,
      unitCode: "mm",
      min: 0,
      max: 10,
      step: 0.1,
    },
  ],
  null,
  2,
);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  await ensureDefaultParameterTemplates();

  return {
    units: await listParameterUnits(),
    templates: await listParameterTemplates(),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "create");

  if (intent === "seed_defaults") {
    await ensureDefaultParameterTemplates();
    return { ok: true, message: "已写入默认镜片和隐形眼镜参数模板。" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const productCategory = String(formData.get("productCategory") ?? "custom").trim();
  const description = String(formData.get("description") ?? "").trim();
  const parametersJson = String(formData.get("parametersJson") ?? "").trim();

  if (!name || !parametersJson) {
    return { ok: false, error: "请输入模板名称和参数定义 JSON。" };
  }

  try {
    const parameters = parseParameterDefinitionsJson(parametersJson);
    await saveParameterTemplate({
      name,
      productCategory:
        productCategory === "lens" ||
        productCategory === "contact_lens" ||
        productCategory === "care" ||
        productCategory === "custom"
          ? productCategory
          : "custom",
      description: description || undefined,
      parameters,
    });

    return { ok: true, message: "参数模板已保存。" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "保存参数模板失败",
    };
  }
};

export default function ParameterTemplatesPage() {
  const { units, templates } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <s-page heading="参数模板管理">
      <s-section heading="快捷初始化">
        {actionData?.ok && (
          <s-banner tone="success" heading="操作成功">
            {actionData.message}
          </s-banner>
        )}
        {actionData?.ok === false && actionData.error && (
          <s-banner tone="critical" heading="操作失败">
            {actionData.error}
          </s-banner>
        )}
        <Form method="post">
          <input type="hidden" name="intent" value="seed_defaults" />
          <s-button type="submit" variant="primary">
            写入默认模板与单位
          </s-button>
        </Form>
      </s-section>

      <s-section heading="新增自定义模板">
        <Form method="post">
          <s-stack direction="block" gap="base">
            <input type="hidden" name="intent" value="create" />
            <s-text-field name="name" label="模板名称" value="" />
            <s-select name="productCategory" label="商品分类" value="custom">
              <s-option value="lens">lens</s-option>
              <s-option value="contact_lens">contact_lens</s-option>
              <s-option value="care">care</s-option>
              <s-option value="custom">custom</s-option>
            </s-select>
            <s-text-area name="description" label="模板说明" value="" />
            <s-text-area
              name="parametersJson"
              label="参数定义 JSON"
              value={SAMPLE_PARAMETERS_JSON}
            />
            <s-paragraph>
              说明：每个参数至少需要 `code`、`label`、`type`、`required`、`position`。
            </s-paragraph>
            <s-button type="submit" variant="primary">
              保存模板
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="单位规格">
        <s-stack direction="block" gap="base">
          {units.map((unit) => (
            <s-box key={unit.id} padding="base" border="base" border-radius="base">
              <s-heading>{unit.code}</s-heading>
              <s-paragraph>名称：{unit.label}</s-paragraph>
              <s-paragraph>精度：{unit.precision}</s-paragraph>
              <s-paragraph>步进：{unit.step ?? "未设置"}</s-paragraph>
            </s-box>
          ))}
        </s-stack>
      </s-section>

      <s-section heading="当前模板">
        <s-stack direction="block" gap="base">
          {templates.map((template) => (
            <s-box key={template.id} padding="base" border="base" border-radius="base">
              <s-heading>{template.name}</s-heading>
              <s-paragraph>分类：{template.productCategory}</s-paragraph>
              <s-paragraph>参数数：{template.parameters.length}</s-paragraph>
              <s-paragraph>说明：{template.description ?? "无"}</s-paragraph>
              <s-unordered-list>
                {template.parameters.map((parameter) => (
                  <s-list-item key={parameter.id}>
                    {parameter.label} / {parameter.code} / {parameter.type}
                    {parameter.unit?.code ? ` / ${parameter.unit.code}` : ""}
                    {parameter.required ? " / required" : ""}
                  </s-list-item>
                ))}
              </s-unordered-list>
            </s-box>
          ))}
        </s-stack>
      </s-section>
    </s-page>
  );
}
