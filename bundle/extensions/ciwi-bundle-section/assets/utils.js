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
