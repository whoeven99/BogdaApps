import type {
  ParameterDefinition,
  ParameterInputValue,
  ParameterValueType,
} from "../types/product-parameters.js";

const VALID_PARAMETER_TYPES = new Set<ParameterValueType>([
  "number",
  "text",
  "select",
  "multi_select",
  "boolean",
]);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isParameterDefinition(value: unknown): value is ParameterDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.code === "string" &&
    typeof item.label === "string" &&
    typeof item.required === "boolean" &&
    typeof item.position === "number" &&
    typeof item.type === "string" &&
    VALID_PARAMETER_TYPES.has(item.type as ParameterValueType) &&
    (item.unitCode === undefined || typeof item.unitCode === "string") &&
    (item.options === undefined || isStringArray(item.options)) &&
    (item.min === undefined || typeof item.min === "number") &&
    (item.max === undefined || typeof item.max === "number") &&
    (item.step === undefined || typeof item.step === "number") &&
    (item.helpText === undefined || typeof item.helpText === "string") &&
    (item.dependsOn === undefined ||
      (typeof item.dependsOn === "object" &&
        item.dependsOn !== null &&
        typeof (item.dependsOn as Record<string, unknown>).code === "string" &&
        isStringArray((item.dependsOn as Record<string, unknown>).values)))
  );
}

export function parseParameterDefinitionsJson(text: string): ParameterDefinition[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed) || !parsed.every(isParameterDefinition)) {
    throw new Error("参数定义 JSON 格式不正确");
  }

  return parsed;
}

export function parseParameterConfigJson(
  text: string | null | undefined,
): {
  options: string[];
  min: number | null;
  max: number | null;
  step: number | null;
  helpText: string | null;
  dependsOn: { code: string; values: string[] } | null;
} {
  if (!text) {
    return {
      options: [],
      min: null,
      max: null,
      step: null,
      helpText: null,
      dependsOn: null,
    };
  }

  const parsed = JSON.parse(text) as Record<string, unknown>;
  return {
    options: isStringArray(parsed.options) ? parsed.options : [],
    min: typeof parsed.min === "number" ? parsed.min : null,
    max: typeof parsed.max === "number" ? parsed.max : null,
    step: typeof parsed.step === "number" ? parsed.step : null,
    helpText: typeof parsed.helpText === "string" ? parsed.helpText : null,
    dependsOn:
      typeof parsed.dependsOn === "object" &&
      parsed.dependsOn !== null &&
      typeof (parsed.dependsOn as Record<string, unknown>).code === "string" &&
      isStringArray((parsed.dependsOn as Record<string, unknown>).values)
        ? {
            code: (parsed.dependsOn as Record<string, unknown>).code as string,
            values: (parsed.dependsOn as Record<string, unknown>).values as string[],
          }
        : null,
  };
}

function isParameterInputValue(value: unknown): value is ParameterInputValue {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    isStringArray(value)
  );
}

export function parseParameterValuesJson(
  text: string,
): Record<string, ParameterInputValue> {
  const parsed = JSON.parse(text) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("参数组合 JSON 必须是对象");
  }

  const record = parsed as Record<string, unknown>;
  for (const value of Object.values(record)) {
    if (!isParameterInputValue(value)) {
      throw new Error("参数组合 JSON 中包含不支持的值类型");
    }
  }

  return record as Record<string, ParameterInputValue>;
}
