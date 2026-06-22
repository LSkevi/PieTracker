import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  convertCurrency,
  convertCurrencySync,
  formatCurrency,
  getCurrencyName,
  getCurrencySymbol,
} from "./currency";
import type { Currency } from "../types";

// These tests deliberately exercise the FALLBACK_RATES code path. With an empty
// localStorage cache, getCachedRates() returns the hardcoded EUR-base fallback
// table, so the conversion math is fully deterministic:
//   FALLBACK_RATES (EUR base): EUR 1.0, USD 1.09, CAD 1.48, GBP 0.86
//   convert(amount, from, to) = round((amount / fromRate) * toRate, 2 decimals)

describe("convertCurrencySync (cached/fallback rates)", () => {
  beforeEach(() => {
    // No cache present -> getCachedRates() falls back to FALLBACK_RATES.
    localStorage.clear();
  });

  it("returns the same amount when currencies are identical", () => {
    expect(convertCurrencySync(42.5, "USD", "USD")).toBe(42.5);
  });

  it("converts across two non-EUR currencies via the EUR base", () => {
    // 100 USD -> 100/1.09 EUR -> *1.48 CAD = 135.7798... -> 135.78
    expect(convertCurrencySync(100, "USD", "CAD")).toBe(135.78);
  });

  it("converts from EUR (base) to another currency", () => {
    // 100 EUR -> 100/1.0 -> *1.09 USD = 109
    expect(convertCurrencySync(100, "EUR", "USD")).toBe(109);
  });

  it("converts to EUR (base) from another currency", () => {
    // 100 CAD -> 100/1.48 EUR -> *1.0 = 67.567... -> 67.57
    expect(convertCurrencySync(100, "CAD", "EUR")).toBe(67.57);
  });

  it("rounds the result to 2 decimal places", () => {
    const result = convertCurrencySync(100, "CAD", "EUR");
    // Assert the value carries at most 2 decimals.
    expect(result).toBe(Math.round(result * 100) / 100);
  });

  it("falls back to a rate of 1 for an unknown source currency", () => {
    // Unknown fromRate defaults to 1: 100/1 -> *1.09 USD = 109
    expect(convertCurrencySync(100, "XYZ", "USD")).toBe(109);
  });

  it("falls back to a rate of 1 for an unknown target currency", () => {
    // Unknown toRate defaults to 1: 100/1.09 -> *1 = 91.74
    expect(convertCurrencySync(100, "USD", "XYZ")).toBe(91.74);
  });

  it("prefers cached rates over the fallback table when a cache exists", () => {
    // Seed a custom cache; conversion should use these rates, not FALLBACK_RATES.
    localStorage.setItem(
      "exchange_rates_cache",
      JSON.stringify({ EUR: 1.0, USD: 2.0 })
    );
    // 10 EUR -> *2.0 USD = 20 (would be 10.9 with the fallback table)
    expect(convertCurrencySync(10, "EUR", "USD")).toBe(20);
  });
});

describe("convertCurrency (async, fallback on fetch failure)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the same amount when currencies are identical (no fetch)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(convertCurrency(50, "EUR", "EUR")).resolves.toBe(50);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses FALLBACK_RATES when the rates API request fails", async () => {
    // No cache timestamp -> shouldFetchRates() is true -> fetchExchangeRates() runs.
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
    // Same math as the sync fallback case: 100 USD -> 135.78 CAD.
    await expect(convertCurrency(100, "USD", "CAD")).resolves.toBe(135.78);
  });
});

describe("formatCurrency", () => {
  it("prefixes the custom symbol and uses 2 decimals by default", () => {
    const out = formatCurrency(1234.5, "USD");
    expect(out.startsWith("US$")).toBe(true);
    // Two decimal digits at the end.
    expect(out).toMatch(/\.\d{2}$/);
  });

  it("omits decimals for zero-decimal currencies like JPY", () => {
    const out = formatCurrency(1000, "JPY");
    expect(out.startsWith("¥")).toBe(true);
    expect(out).not.toMatch(/\.\d/);
  });

  it("falls back to the raw code for an unknown currency", () => {
    const out = formatCurrency(10, "ABC");
    expect(out.startsWith("ABC")).toBe(true);
  });
});

describe("getCurrencySymbol / getCurrencyName", () => {
  const currencies: Currency[] = [
    { code: "USD", symbol: "US$", name: "US Dollar" },
  ];

  it("returns the symbol from the provided list when present", () => {
    expect(getCurrencySymbol(currencies, "USD")).toBe("US$");
  });

  it("uses the fallback symbol map when not in the list", () => {
    expect(getCurrencySymbol(currencies, "EUR")).toBe("€");
  });

  it("returns the raw code when no symbol is known", () => {
    expect(getCurrencySymbol(currencies, "ABC")).toBe("ABC");
  });

  it("returns the name from the list when present", () => {
    expect(getCurrencyName(currencies, "USD")).toBe("US Dollar");
  });
});
