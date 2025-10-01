import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import type { Expense, MonthlySummary, Currency } from "../types";
import { getCategoryColor, isDarkModeEnabled } from "../constants/colors";
import { formatCurrency, convertCurrency } from "../utils/currency";

interface InfoPanelProps {
  summary: MonthlySummary | null;
  expenses: Expense[];
  availableMonths: { year: number; month: number; year_month: string }[];
  selectedMonth: number;
  selectedYear: number;
  selectedCurrency: string;
  currencies: Currency[];
  onMonthYearChange: (month: number, year: number) => void;
  onCurrencyChange: (currency: string) => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  summary,
  expenses,
  availableMonths,
  selectedMonth,
  selectedYear,
  selectedCurrency,
  currencies,
  onMonthYearChange,
  onCurrencyChange,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(() => isDarkModeEnabled());
  const [convertedAmounts, setConvertedAmounts] = useState<{
    [key: string]: number;
  }>({});

  useEffect(() => {
    // Listen for theme changes
    const observer = new MutationObserver(() => {
      setIsDarkMode(isDarkModeEnabled());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  // Convert amounts when currency or data changes
  useEffect(() => {
    const convertAmounts = async () => {
      if (!summary) return;

      const converted: { [key: string]: number } = {};

      // Convert total amount
      converted.total = await convertCurrency(
        summary.total,
        "USD",
        selectedCurrency
      );

      // Convert category amounts
      for (const [category, amount] of Object.entries(summary.categories)) {
        converted[category] = await convertCurrency(
          amount,
          "USD",
          selectedCurrency
        );
      }

      // Convert latest expense if exists
      if (expenses.length > 0) {
        const latestExpense = expenses[0];
        const fromCurrency = latestExpense.currency || "USD";
        converted.latestExpense = await convertCurrency(
          latestExpense.amount,
          fromCurrency,
          selectedCurrency
        );
      }

      // Convert recent expenses (first 5)
      for (let i = 0; i < Math.min(expenses.length, 5); i++) {
        const expense = expenses[i];
        const fromCurrency = expense.currency || "USD";
        converted[`expense_${i}`] = await convertCurrency(
          expense.amount,
          fromCurrency,
          selectedCurrency
        );
      }

      setConvertedAmounts(converted);
    };

    convertAmounts();
  }, [summary, selectedCurrency, expenses]);

  const preparePieData = () => {
    if (!summary || !summary.categories) return [];

    return Object.entries(summary.categories).map(([category, amount]) => ({
      name: category,
      value: convertedAmounts[category] || amount,
    }));
  };

  const handleMonthSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = parseInt(e.target.value);
    onMonthYearChange(month, selectedYear);
  };

  const handleYearSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value);
    onMonthYearChange(selectedMonth, year);
  };

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  // Get unique years from available months, fallback to current year range
  const availableYears =
    availableMonths.length > 0
      ? [...new Set(availableMonths.map((item) => item.year))].sort(
          (a, b) => b - a
        )
      : Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  // Check if a month has data for the selected year
  const hasDataForMonth = (month: number, year: number) => {
    return availableMonths.some(
      (item) => item.month === month && item.year === year
    );
  };

  return (
    <div className="info-panel">
      {/* Falling Leaves Background Animation */}
      <div className="falling-leaves">
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
        <div className="falling-leaf"></div>
      </div>

      {/* Month Selector */}
      <div className="month-selector">
        <label>Select Month & Year:</label>
        <select
          value={selectedMonth}
          onChange={handleMonthSelectChange}
          className="month-picker"
        >
          {months.map((month) => {
            const hasData = hasDataForMonth(month.value, selectedYear);
            return (
              <option key={month.value} value={month.value}>
                {month.label} {hasData ? "*" : ""}
              </option>
            );
          })}
        </select>
        <select
          value={selectedYear}
          onChange={handleYearSelectChange}
          className="month-picker"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {summary && (
        <>
          {/* Summary Info */}
          <div className="summary-info">
            <div className="currency-selector-section">
              <div className="currency-display">
                <span className="currency-label">Displaying in: </span>
                <span className="currency-code">{selectedCurrency}</span>
              </div>
              <div className="currency-selector">
                <label htmlFor="display-currency">
                  Change Display Currency:
                </label>
                <select
                  id="display-currency"
                  value={selectedCurrency}
                  onChange={(e) => onCurrencyChange(e.target.value)}
                  className="currency-select-display"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} ({currency.symbol}) - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="total-amount">
              {formatCurrency(
                convertedAmounts.total || summary.total,
                selectedCurrency
              )}
            </div>
            <div className="currency">
              Total spent in{" "}
              {format(
                new Date(selectedYear, selectedMonth - 1, 1),
                "MMMM yyyy",
                { locale: enUS }
              )}
            </div>
            <p className="expense-count">
              {summary.expense_count} expenses recorded
            </p>
          </div>

          {/* Chart Legend */}
          {Object.keys(summary.categories).length > 0 && (
            <div className="chart-legend-vertical">
              <h4 className="legend-title">Categories</h4>
              {preparePieData().map((item) => (
                <div key={item.name} className="legend-item-vertical">
                  <div
                    className="legend-color"
                    style={{
                      backgroundColor: getCategoryColor(item.name, isDarkMode),
                    }}
                  ></div>
                  <div className="legend-text-vertical">
                    <span className="legend-category">{item.name}</span>
                    <span className="legend-amount">
                      {formatCurrency(
                        convertedAmounts[item.name] || item.value,
                        selectedCurrency
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Latest Expense */}
          {expenses.length > 0 && (
            <div className="latest-expense-info">
              <h4 className="recent-title">Latest Expense</h4>
              <div className="expense-item-info">
                <div className="expense-info">
                  <span className="expense-desc">
                    {expenses[0].description}
                  </span>
                  <span className="expense-details">
                    {expenses[0].category} • {expenses[0].date}
                  </span>
                  <span className="expense-original-currency">
                    Original:{" "}
                    {formatCurrency(
                      expenses[0].amount,
                      expenses[0].currency || "USD"
                    )}
                  </span>
                </div>
                <div className="expense-amounts">
                  <span className="expense-amount-converted">
                    {formatCurrency(
                      convertedAmounts.latestExpense || expenses[0].amount,
                      selectedCurrency
                    )}
                  </span>
                  {(expenses[0].currency || "USD") !== selectedCurrency && (
                    <span className="conversion-indicator">
                      (converted from {expenses[0].currency || "USD"})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Recent Expenses List */}
          {expenses.length > 1 && (
            <div className="recent-expenses-list">
              <h4 className="recent-title">Recent Expenses</h4>
              <div className="expenses-scroll">
                {expenses.slice(0, 5).map((expense, index) => (
                  <div key={expense.id || index} className="expense-row">
                    <div className="expense-row-info">
                      <span className="expense-row-desc">
                        {expense.description}
                      </span>
                      <span className="expense-row-category">
                        {expense.category}
                      </span>
                      <span className="expense-original-currency">
                        Original:{" "}
                        {formatCurrency(
                          expense.amount,
                          expense.currency || "USD"
                        )}
                      </span>
                    </div>
                    <div className="expense-row-amounts">
                      <span className="expense-row-converted">
                        {formatCurrency(
                          convertedAmounts[`expense_${index}`] ||
                            expense.amount,
                          selectedCurrency
                        )}
                      </span>
                      {(expense.currency || "USD") !== selectedCurrency && (
                        <span className="expense-row-conversion">
                          from {expense.currency || "USD"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InfoPanel;
