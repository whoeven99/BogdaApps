// utils.js
/**
 * 包含价格转换、解析和格式化的工具函数
 */

export function detectNumberFormat(moneyFormat, price) {
  console.log("moneyFormat: ", moneyFormat);
  console.log("price: ", price);

  let number = price.toString();
  console.log("number: ", number);

  let [integerPart, decimalPart = "00"] = number.split(".");
  decimalPart = Number(`0.${decimalPart}`).toFixed(2).slice(2);
  switch (true) {
    case moneyFormat.includes("amount_no_decimals"):
      console.log("amount_no_decimals");
      return formatWithComma(integerPart, "");
    case moneyFormat.includes("amount_with_comma_separator"):
      console.log("amount_with_comma_separator");
      return formatWithCommaAndCommaDecimal(integerPart, decimalPart);
    case moneyFormat.includes("amount_no_decimals_with_comma_separator"):
      console.log("amount_no_decimals_with_comma_separator");
      return formatWithCommaAndCommaDecimal(integerPart, "");
    case moneyFormat.includes("amount_with_apostrophe_separator"):
      console.log("amount_with_apostrophe_separator");
      return formatWithApostrophe(integerPart, decimalPart);
    case moneyFormat.includes("amount_no_decimals_with_space_separator"):
      console.log("amount_no_decimals_with_space_separator");
      return formatWithSpace(integerPart, "");
    case moneyFormat.includes("amount_with_space_separator"):
      console.log("amount_with_space_separator");
      return formatWithSpace(integerPart, decimalPart);
    case moneyFormat.includes("amount_with_period_and_space_separator"):
      console.log("amount_with_period_and_space_separator");
      return formatWithSpaceAndPeriod(integerPart, decimalPart);
    case moneyFormat.includes("amount"):
      console.log("amount");
      return formatWithComma(integerPart, decimalPart);
    default:
      console.log("default");
      return number;
  }
}

function formatWithComma(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}
function formatWithCommaAndCommaDecimal(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimalPart ? `${integerPart},${decimalPart}` : integerPart;
}
function formatWithApostrophe(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}
function formatWithSpace(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimalPart ? `${integerPart},${decimalPart}` : integerPart;
}
function formatWithSpaceAndPeriod(integerPart, decimalPart) {
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

export function transObjectConfigToArray(configElJson) {
  const ciwiBundleconfig = Object.keys(configElJson)
    .filter((key) => key.startsWith("ciwi_bundles_config_"))
    .map((key) => ({
      bundleKey: key,
      ...configElJson[key],
    }));

  console.log("ciwiBundleconfig: ", ciwiBundleconfig);

  return ciwiBundleconfig;
}

export function searchCartAddForm() {
  let form = null;
  const cartAddforms = document.querySelectorAll('form[action*="/cart/add"]');

  for (const cartAddform of cartAddforms) {
    const children = Array.from(cartAddform.children);
    console.log(configElJson.variantIds);

    for (const child of children) {
      console.log(child.tagName === "INPUT");
      console.log(child.value);
      console.log(configElJson.variantIds.includes(Number(child.value)));
      if (
        child.tagName === "INPUT" &&
        child.name === "id" &&
        configElJson.variantIds.includes(Number(child.value))
      ) {
        form = cartAddform;
        break;
      }
    }
  }

  console.log("form: ", form);

  return form;
}

export function searchVariantInputOnForm(form) {
  const variantInput = form.querySelector('input[name="id"]');
  console.log("variantInput: ", variantInput);
  return variantInput;
}

export function getMostUsefulBundle(bundleEntries) {
  let bundleData = null;

  for (const bundle of bundleEntries) {
    console.log("bundle: ", bundle);

    const discountRules = bundle?.discount_rules || [];
    console.log("discountRules: ", discountRules);
    const targetingSettingsData = bundle?.targeting_settings || {};
    console.log("targetingSettingsData: ", targetingSettingsData);
    const selectedProductVariantIds =
      bundle?.product_pool?.include_variant_ids || [];
    console.log("selectedProductVariantIds: ", selectedProductVariantIds);

    const isInTargetMarketArray =
      targetingSettingsData?.marketVisibilitySettingData?.some((market) =>
        market?.includes(`gid://shopify/Market/${configElJson.marketId}`),
      );
    console.log("isInTargetMarketArray: ", isInTargetMarketArray);

    if (!isInTargetMarketArray) continue;

    const isInSelectedProductVariantIdsArray =
      selectedProductVariantIds?.includes(String(variantInput?.value));
    console.log(
      "isInSelectedProductVariantIdsArray: ",
      isInSelectedProductVariantIdsArray,
    );

    if (!isInSelectedProductVariantIdsArray) continue;

    console.log("discountRules: ", discountRules);

    if (!Array.isArray(discountRules) || discountRules.length === 0) continue;

    bundleData = bundle;
    break;
  }

  return bundleData;
}
