import type { Currency } from "../types";

// Default currency mappings for locale formatting
const CURRENCY_LOCALES: { [key: string]: string } = {
  CAD: "en-CA",
  USD: "en-US",
  EUR: "en-IE", // or could use "de-DE" for German locale
  GBP: "en-GB",
  JPY: "ja-JP",
  AUD: "en-AU",
  CHF: "de-CH",
  CNY: "zh-CN",
  INR: "en-IN",
  BRL: "pt-BR",
};

export const formatCurrency = (
  amount: number,
  currencyCode: string
): string => {
  const locale = CURRENCY_LOCALES[currencyCode] || "en-US";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    // Fallback if currency is not supported
    console.warn(`Currency ${currencyCode} not supported, falling back to CAD`);
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  }
};

export const getCurrencySymbol = (
  currencies: Currency[],
  currencyCode: string
): string => {
  const currency = currencies.find((c) => c.code === currencyCode);
  return currency?.symbol || "$";
};

export const getCurrencyName = (
  currencies: Currency[],
  currencyCode: string
): string => {
  const currency = currencies.find((c) => c.code === currencyCode);
  return currency?.name || "Canadian Dollar";
};

// Get the default/preferred currency (can be expanded to save user preference)
export const getDefaultCurrency = (): string => {
  return localStorage.getItem("preferred-currency") || "CAD";
};

// Save user's preferred currency
export const setDefaultCurrency = (currencyCode: string): void => {
  localStorage.setItem("preferred-currency", currencyCode);
};
