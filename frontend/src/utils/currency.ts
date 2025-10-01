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

  // Special handling for currencies that don't use decimal places
  const noDecimalCurrencies = ["JPY", "KRW", "VND", "CLP"];
  const useDecimals = !noDecimalCurrencies.includes(currencyCode);

  // Force custom symbols for CAD and USD to distinguish them
  const customSymbols: { [key: string]: string } = {
    CAD: "CA$",
    USD: "US$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    AUD: "A$",
    CHF: "Fr",
    CNY: "¥",
    INR: "₹",
    BRL: "R$",
  };

  // Always use custom formatting for better currency distinction
  const symbol = customSymbols[currencyCode] || currencyCode;
  const formattedAmount = amount.toLocaleString(locale, {
    minimumFractionDigits: useDecimals ? 2 : 0,
    maximumFractionDigits: useDecimals ? 2 : 0,
  });

  return `${symbol}${formattedAmount}`;
};

export const getCurrencySymbol = (
  currencies: Currency[],
  currencyCode: string
): string => {
  const currency = currencies.find((c) => c.code === currencyCode);

  // If currency is found, return its symbol
  if (currency) {
    return currency.symbol;
  }

  // Enhanced fallback with common currency symbols
  const fallbackSymbols: { [key: string]: string } = {
    CAD: "CA$",
    USD: "US$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    AUD: "A$",
    CHF: "Fr",
    CNY: "¥",
    INR: "₹",
    BRL: "R$",
  };

  return fallbackSymbols[currencyCode] || currencyCode;
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

// API Configuration
const API_KEY = "730f4598bf272159bdd59dbcc2ccf680";
const API_URL = "https://api.exchangeratesapi.io/v1/latest";

// Fallback exchange rates (base currency: EUR - as per exchangeratesapi.io)
const FALLBACK_RATES: { [key: string]: number } = {
  EUR: 1.0,
  USD: 1.09,
  CAD: 1.48,
  GBP: 0.86,
  JPY: 163.2,
  AUD: 1.67,
  CHF: 0.96,
  CNY: 7.89,
  INR: 90.8,
  BRL: 5.42,
};

// Cache keys
const CACHE_KEY = "exchange_rates_cache";
const CACHE_TIMESTAMP_KEY = "exchange_rates_timestamp";

// Check if we should fetch new rates (max 3 times per day)
const shouldFetchRates = (): boolean => {
  const lastFetch = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (!lastFetch) return true;

  const lastFetchTime = new Date(lastFetch);
  const now = new Date();
  const timeDiff = now.getTime() - lastFetchTime.getTime();

  // 8 hours = 8 * 60 * 60 * 1000 milliseconds (3 times per day)
  const eightHours = 8 * 60 * 60 * 1000;

  return timeDiff > eightHours;
};

// Get cached rates
const getCachedRates = (): { [key: string]: number } => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("Failed to parse cached exchange rates:", error);
  }
  return FALLBACK_RATES;
};

// Fetch fresh exchange rates from API
const fetchExchangeRates = async (): Promise<{ [key: string]: number }> => {
  try {
    console.log("🔄 Fetching fresh exchange rates...");

    const response = await fetch(
      `${API_URL}?access_key=${API_KEY}&symbols=USD,CAD,GBP,JPY,AUD,CHF,CNY,INR,BRL`
    );

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`API error: ${data.error?.info || "Unknown error"}`);
    }

    // API returns rates with EUR as base, add EUR: 1.0
    const rates = {
      EUR: 1.0,
      ...data.rates,
    };

    // Cache the rates and timestamp
    localStorage.setItem(CACHE_KEY, JSON.stringify(rates));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());

    console.log("✅ Exchange rates updated successfully");
    return rates;
  } catch (error) {
    console.warn("❌ Failed to fetch exchange rates, using fallback:", error);
    return FALLBACK_RATES;
  }
};

// Main function to get current exchange rates
export const getExchangeRates = async (): Promise<{
  [key: string]: number;
}> => {
  if (shouldFetchRates()) {
    return await fetchExchangeRates();
  } else {
    const cachedRates = getCachedRates();
    console.log("📱 Using cached exchange rates");
    return cachedRates;
  }
};

// Convert amount from one currency to another (async version)
export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await getExchangeRates();

  // Convert from source currency to EUR (base), then to target currency
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;

  // Convert: amount in fromCurrency -> EUR -> toCurrency
  const amountInEUR = amount / fromRate;
  const convertedAmount = amountInEUR * toRate;

  return Math.round(convertedAmount * 100) / 100;
};

// Synchronous version for immediate use (uses cached rates only)
export const convertCurrencySync = (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number => {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = getCachedRates();
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;

  const amountInEUR = amount / fromRate;
  const convertedAmount = amountInEUR * toRate;

  return Math.round(convertedAmount * 100) / 100;
};

// Get last update time
export const getLastUpdateTime = (): string | null => {
  const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (!timestamp) return null;

  return new Date(timestamp).toLocaleString();
};

// Get cache status
export const getCacheStatus = (): {
  hasCache: boolean;
  lastUpdate: string | null;
  nextUpdate: string | null;
} => {
  const lastFetch = localStorage.getItem(CACHE_TIMESTAMP_KEY);

  if (!lastFetch) {
    return {
      hasCache: false,
      lastUpdate: null,
      nextUpdate: null,
    };
  }

  const lastFetchTime = new Date(lastFetch);
  const nextUpdateTime = new Date(lastFetchTime.getTime() + 8 * 60 * 60 * 1000);

  return {
    hasCache: true,
    lastUpdate: lastFetchTime.toLocaleString(),
    nextUpdate: nextUpdateTime.toLocaleString(),
  };
};
