import { beforeEach, describe, expect, it } from "vitest";
import { aggregateYearlyData } from "./ChartDisplay";
import type { Expense } from "../types";

// Seed deterministic EUR-based exchange rates so convertCurrencySync is exact.
// convertCurrencySync converts amount / fromRate * toRate.
const RATES = { USD: 1, BRL: 5, JPY: 100 };

beforeEach(() => {
  localStorage.setItem("exchange_rates_cache", JSON.stringify(RATES));
});

const makeExpense = (
  amount: number,
  currency: string,
  date: string
): Expense => ({
  id: `${currency}-${amount}-${date}`,
  amount,
  category: "Food",
  description: "",
  date,
  currency,
  created_at: date,
});

describe("aggregateYearlyData", () => {
  it("converts each expense to the target currency before summing", () => {
    const expenses = [
      makeExpense(50, "BRL", "2026-03-10"), // 50 / 5 * 1 = 10 USD
      makeExpense(20, "USD", "2026-03-15"), // same currency = 20 USD
      makeExpense(1000, "JPY", "2026-03-20"), // 1000 / 100 * 1 = 10 USD
    ];

    const { data, total } = aggregateYearlyData(expenses, "USD");

    expect(total).toBe(40);

    const march = data.find((d) => d.month === "Mar");
    expect(march?.spending).toBe(40);
  });

  it("y-axis max follows the largest month", () => {
    const expenses = [
      makeExpense(20, "USD", "2026-01-05"), // Jan: 20 USD
      makeExpense(50, "BRL", "2026-06-05"), // Jun: 10 USD
      makeExpense(1000, "JPY", "2026-06-20"), // Jun: 10 USD -> 20 USD total
      makeExpense(500, "BRL", "2026-09-05"), // Sep: 100 USD (largest)
    ];

    const { data } = aggregateYearlyData(expenses, "USD");

    const maxSpending = Math.max(...data.map((d) => d.spending));
    expect(maxSpending).toBe(100);

    const september = data.find((d) => d.month === "Sep");
    expect(september?.spending).toBe(maxSpending);
  });
});
