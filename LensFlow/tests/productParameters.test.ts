import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_CONTACT_LENS_PARAMETER_TEMPLATE,
  DEFAULT_LENS_PARAMETER_TEMPLATE,
  DEFAULT_PARAMETER_UNITS,
  buildParameterSignature,
} from "../src/types/product-parameters.js";

test("参数签名应按 key 排序并稳定序列化", () => {
  const signature = buildParameterSignature({
    right_sph: -1.25,
    left_sph: -1,
    replacement_cycle: "monthly",
    colors: ["blue", "green"],
    enabled: true,
  });

  assert.equal(
    signature,
    "colors=blue,green|enabled=true|left_sph=-1|replacement_cycle=monthly|right_sph=-1.25",
  );
});

test("标准镜片模板应包含核心配镜参数", () => {
  const codes = new Set(
    DEFAULT_LENS_PARAMETER_TEMPLATE.parameters.map((parameter) => parameter.code),
  );

  assert.ok(codes.has("prescription_type"));
  assert.ok(codes.has("left_sph"));
  assert.ok(codes.has("right_cyl"));
  assert.ok(codes.has("add_power"));
  assert.ok(codes.has("pd"));
});

test("标准隐形眼镜模板应包含核心隐形眼镜参数", () => {
  const codes = new Set(
    DEFAULT_CONTACT_LENS_PARAMETER_TEMPLATE.parameters.map(
      (parameter) => parameter.code,
    ),
  );

  assert.ok(codes.has("sph"));
  assert.ok(codes.has("bc"));
  assert.ok(codes.has("dia"));
  assert.ok(codes.has("replacement_cycle"));
  assert.ok(codes.has("pack_size"));
});

test("默认单位应覆盖常见镜片和隐形眼镜单位", () => {
  const codes = new Set(DEFAULT_PARAMETER_UNITS.map((unit) => unit.code));

  assert.ok(codes.has("D"));
  assert.ok(codes.has("mm"));
  assert.ok(codes.has("pcs"));
  assert.ok(codes.has("degree"));
});
