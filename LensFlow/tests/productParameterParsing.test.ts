import assert from "node:assert/strict";
import test from "node:test";

import {
  parseParameterConfigJson,
  parseParameterDefinitionsJson,
  parseParameterValuesJson,
} from "../src/lib/product-parameters.js";

test("应解析合法的参数定义 JSON", () => {
  const definitions = parseParameterDefinitionsJson(
    JSON.stringify([
      {
        code: "bc",
        label: "BC",
        type: "number",
        required: true,
        position: 10,
        unitCode: "mm",
      },
    ]),
  );

  assert.equal(definitions.length, 1);
  assert.equal(definitions[0]?.code, "bc");
});

test("参数定义 JSON 非法时应抛错", () => {
  assert.throws(() =>
    parseParameterDefinitionsJson(
      JSON.stringify([{ code: "bc", label: "BC", position: 10 }]),
    ),
  );
});

test("应解析合法的参数组合 JSON", () => {
  const values = parseParameterValuesJson(
    JSON.stringify({
      left_sph: -1.25,
      replacement_cycle: "monthly",
      colors: ["blue", "green"],
    }),
  );

  assert.equal(values.left_sph, -1.25);
  assert.deepEqual(values.colors, ["blue", "green"]);
});

test("参数组合 JSON 为数组时应抛错", () => {
  assert.throws(() => parseParameterValuesJson(JSON.stringify(["bad"])));
});

test("应解析参数配置 JSON 中的选项、范围和依赖", () => {
  const config = parseParameterConfigJson(
    JSON.stringify({
      options: ["daily", "monthly"],
      min: 1,
      max: 10,
      step: 0.5,
      helpText: "请选择周期",
      dependsOn: {
        code: "lens_type",
        values: ["toric"],
      },
    }),
  );

  assert.deepEqual(config.options, ["daily", "monthly"]);
  assert.equal(config.min, 1);
  assert.equal(config.max, 10);
  assert.equal(config.step, 0.5);
  assert.equal(config.helpText, "请选择周期");
  assert.deepEqual(config.dependsOn, {
    code: "lens_type",
    values: ["toric"],
  });
});
