import type { CartMarketContext, CartMoneyFormat } from "./types";

type FormatParts = {
  integerPart: string;
  decimalPart: string;
};

function splitNumberParts(value: number): FormatParts {
  const asString = Number(value).toFixed(2);
  const [integerPart, decimalPart = "00"] = asString.split(".");
  return {
    integerPart,
    decimalPart: Number(`0.${decimalPart}`).toFixed(2).slice(2),
  };
}

function formatWithComma(integerPart: string, decimalPart: string) {
  const next = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart ? `${next}.${decimalPart}` : next;
}

function formatWithCommaAndCommaDecimal(integerPart: string, decimalPart: string) {
  const next = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimalPart ? `${next},${decimalPart}` : next;
}

function formatWithApostrophe(integerPart: string, decimalPart: string) {
  const next = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return decimalPart ? `${next}.${decimalPart}` : next;
}

function formatWithSpace(integerPart: string, decimalPart: string) {
  const next = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimalPart ? `${next},${decimalPart}` : next;
}

function formatWithSpaceAndPeriod(integerPart: string, decimalPart: string) {
  const next = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimalPart ? `${next}.${decimalPart}` : next;
}

function formatNumberByMoneyFormat(value: number, moneyFormat: CartMoneyFormat) {
  const { integerPart, decimalPart } = splitNumberParts(value);
  switch (true) {
    case moneyFormat.includes("amount_no_decimals"):
      if (moneyFormat.includes("comma_separator")) {
        return formatWithCommaAndCommaDecimal(integerPart, "");
      }
      if (moneyFormat.includes("space_separator")) {
        return formatWithSpace(integerPart, "");
      }
      return formatWithComma(integerPart, "");
    case moneyFormat.includes("amount_with_comma_separator"):
      return formatWithCommaAndCommaDecimal(integerPart, decimalPart);
    case moneyFormat.includes("amount_with_apostrophe_separator"):
      return formatWithApostrophe(integerPart, decimalPart);
    case moneyFormat.includes("amount_with_space_separator"):
      return formatWithSpace(integerPart, decimalPart);
    case moneyFormat.includes("amount_with_period_and_space_separator"):
      return formatWithSpaceAndPeriod(integerPart, decimalPart);
    case moneyFormat.includes("amount"):
      return formatWithComma(integerPart, decimalPart);
    default:
      return Number(value).toFixed(2);
  }
}

export function formatMoney(minor: number, market: CartMarketContext) {
  const amount = (Number(minor) || 0) / 100;
  const currencySymbol = market.currencySymbol || market.currencyCode || "$";
  const moneyFormat = market.moneyFormat || "amount";
  const formattedNumber = formatNumberByMoneyFormat(amount, moneyFormat);
  return `${currencySymbol}${formattedNumber}`;
}

export function buildFallbackMarket(): CartMarketContext {
  return {
    marketId: "default",
    marketName: "Default",
    currencyCode: "USD",
    currencySymbol: "$",
    moneyFormat: "amount",
    locale: "en-US",
    taxDisplay: "unknown",
  };
}
