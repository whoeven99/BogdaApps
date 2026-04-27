export type ParameterValueType =
  | "number"
  | "text"
  | "select"
  | "multi_select"
  | "boolean";

export type ProductParameterCategory =
  | "lens"
  | "contact_lens"
  | "care"
  | "custom";

export type ParameterUnitDefinition = {
  code: string;
  label: string;
  precision: number;
  step?: number;
};

export type ParameterDefinition = {
  code: string;
  label: string;
  type: ParameterValueType;
  required: boolean;
  unitCode?: string;
  position: number;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  helpText?: string;
  dependsOn?: {
    code: string;
    values: string[];
  };
};

export type ParameterTemplateDefinition = {
  name: string;
  productCategory: ProductParameterCategory;
  description?: string;
  parameters: ParameterDefinition[];
};

export type ParameterInputValue =
  | string
  | number
  | boolean
  | string[]
  | null
  | undefined;

export const DEFAULT_PARAMETER_UNITS: ParameterUnitDefinition[] = [
  { code: "D", label: "Diopter", precision: 2, step: 0.25 },
  { code: "mm", label: "Millimeter", precision: 2, step: 0.1 },
  { code: "%", label: "Percent", precision: 0, step: 1 },
  { code: "pcs", label: "Pieces", precision: 0, step: 1 },
  { code: "box", label: "Box", precision: 0, step: 1 },
  { code: "pair", label: "Pair", precision: 0, step: 1 },
  { code: "degree", label: "Degree", precision: 0, step: 1 },
];

export const DEFAULT_LENS_PARAMETER_TEMPLATE: ParameterTemplateDefinition = {
  name: "标准镜片参数模板",
  productCategory: "lens",
  description: "适用于框架眼镜镜片的标准参数模板",
  parameters: [
    {
      code: "prescription_type",
      label: "处方类型",
      type: "select",
      required: true,
      position: 10,
      options: ["non_prescription", "single_vision", "progressive", "reading"],
    },
    {
      code: "left_sph",
      label: "左眼 SPH",
      type: "number",
      required: false,
      unitCode: "D",
      position: 20,
      min: -20,
      max: 20,
      step: 0.25,
    },
    {
      code: "right_sph",
      label: "右眼 SPH",
      type: "number",
      required: false,
      unitCode: "D",
      position: 30,
      min: -20,
      max: 20,
      step: 0.25,
    },
    {
      code: "left_cyl",
      label: "左眼 CYL",
      type: "number",
      required: false,
      unitCode: "D",
      position: 40,
      min: -8,
      max: 8,
      step: 0.25,
    },
    {
      code: "right_cyl",
      label: "右眼 CYL",
      type: "number",
      required: false,
      unitCode: "D",
      position: 50,
      min: -8,
      max: 8,
      step: 0.25,
    },
    {
      code: "left_axis",
      label: "左眼 AXIS",
      type: "number",
      required: false,
      unitCode: "degree",
      position: 60,
      min: 0,
      max: 180,
      step: 1,
    },
    {
      code: "right_axis",
      label: "右眼 AXIS",
      type: "number",
      required: false,
      unitCode: "degree",
      position: 70,
      min: 0,
      max: 180,
      step: 1,
    },
    {
      code: "add_power",
      label: "ADD",
      type: "number",
      required: false,
      unitCode: "D",
      position: 80,
      min: 0,
      max: 4,
      step: 0.25,
    },
    {
      code: "pd",
      label: "PD",
      type: "number",
      required: false,
      unitCode: "mm",
      position: 90,
      min: 40,
      max: 80,
      step: 0.5,
    },
  ],
};

export const DEFAULT_CONTACT_LENS_PARAMETER_TEMPLATE: ParameterTemplateDefinition =
  {
    name: "标准隐形眼镜参数模板",
    productCategory: "contact_lens",
    description: "适用于隐形眼镜的标准参数模板",
    parameters: [
      {
        code: "sph",
        label: "SPH",
        type: "number",
        required: true,
        unitCode: "D",
        position: 10,
        min: -20,
        max: 20,
        step: 0.25,
      },
      {
        code: "cyl",
        label: "CYL",
        type: "number",
        required: false,
        unitCode: "D",
        position: 20,
        min: -8,
        max: 8,
        step: 0.25,
      },
      {
        code: "axis",
        label: "AXIS",
        type: "number",
        required: false,
        unitCode: "degree",
        position: 30,
        min: 0,
        max: 180,
        step: 1,
      },
      {
        code: "bc",
        label: "BC",
        type: "number",
        required: true,
        unitCode: "mm",
        position: 40,
        min: 6,
        max: 10,
        step: 0.1,
      },
      {
        code: "dia",
        label: "DIA",
        type: "number",
        required: true,
        unitCode: "mm",
        position: 50,
        min: 10,
        max: 20,
        step: 0.1,
      },
      {
        code: "replacement_cycle",
        label: "更换周期",
        type: "select",
        required: true,
        position: 60,
        options: ["daily", "biweekly", "monthly"],
      },
      {
        code: "pack_size",
        label: "包装片数",
        type: "number",
        required: true,
        unitCode: "pcs",
        position: 70,
        min: 1,
        max: 180,
        step: 1,
      },
    ],
  };

function normalizeSignatureValue(value: ParameterInputValue): string {
  if (Array.isArray(value)) {
    return [...value].sort().join(",");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function buildParameterSignature(
  values: Record<string, ParameterInputValue>,
): string {
  return Object.keys(values)
    .sort()
    .map((key) => `${key}=${normalizeSignatureValue(values[key])}`)
    .join("|");
}
