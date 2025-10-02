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
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);

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

  // Handle escape key for closing calendar popup
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showCalendarPopup) {
        setShowCalendarPopup(false);
      }
    };

    if (showCalendarPopup) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [showCalendarPopup]);

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

  // Get extended year range (2020-2030) plus any additional years from data
  const baseYears = Array.from({ length: 11 }, (_, i) => 2020 + i); // 2020-2030
  const dataYears =
    availableMonths.length > 0
      ? [...new Set(availableMonths.map((item) => item.year))]
      : [];
  const allYears = [...new Set([...baseYears, ...dataYears])].sort(
    (a, b) => b - a
  );

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

      {/* Calendar Period Selector */}
      <div className="calendar-selector">
        <div className="chart-title">Select Period</div>
        <div
          className="calendar-trigger"
          onClick={() => setShowCalendarPopup(true)}
        >
          <div className="current-period">
            <span className="month-name">
              {months[selectedMonth - 1]?.label}
            </span>
            <span className="year-name">{selectedYear}</span>
          </div>
          <div className="calendar-icon">📅</div>
        </div>

        {/* Calendar Popup */}
        {showCalendarPopup && (
          <div
            className="calendar-popup-overlay"
            onClick={() => setShowCalendarPopup(false)}
          >
            <div
              className="calendar-popup"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="calendar-header">
                <div className="chart-title">Choose Month & Year</div>
                <button
                  className="close-btn"
                  onClick={() => setShowCalendarPopup(false)}
                >
                  ×
                </button>
              </div>

              <div className="calendar-instructions">
                <p>First select a year, then choose your month</p>
              </div>

              {/* Year Selector */}
              <div className="year-grid">
                <div className="year-grid-title">Select Year (2020-2030)</div>
                <div className="year-buttons">
                  {allYears.map((year) => (
                    <button
                      key={year}
                      className={`year-btn ${
                        year === selectedYear ? "selected" : ""
                      }`}
                      onClick={() => {
                        // Update year but keep popup open for month selection
                        onMonthYearChange(selectedMonth, year);
                      }}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {/* Separator */}
              <div className="calendar-separator"></div>

              {/* Month Selector */}
              <div className="month-grid-popup">
                <div className="month-grid-title">
                  Select Month for {selectedYear}
                </div>
                <div className="month-buttons">
                  {months.map((month) => {
                    const hasData = hasDataForMonth(month.value, selectedYear);
                    const isSelected = month.value === selectedMonth;
                    return (
                      <button
                        key={month.value}
                        className={`month-btn-popup ${
                          isSelected ? "selected" : ""
                        } ${hasData ? "has-data" : "no-data"}`}
                        onClick={() => {
                          onMonthYearChange(month.value, selectedYear);
                          setShowCalendarPopup(false);
                        }}
                      >
                        <span className="month-short">
                          {month.label.slice(0, 3)}
                        </span>
                        <span className="month-full">{month.label}</span>
                        {hasData && <div className="data-indicator"></div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {summary && (
        <>
          {/* Summary Info */}
          <div className="summary-info">
            <div className="currency-selector-section">
              <div className="chart-title">Displaying in</div>
              <div className="currency-display-trigger">
                <div className="current-currency">
                  <span className="currency-code-main">{selectedCurrency}</span>
                  <span className="currency-name">
                    {currencies.find((c) => c.code === selectedCurrency)
                      ?.name || selectedCurrency}
                  </span>
                </div>
                <div className="currency-dropdown">
                  <select
                    id="display-currency"
                    value={selectedCurrency}
                    onChange={(e) => onCurrencyChange(e.target.value)}
                    className="currency-select-styled"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} ({currency.symbol}) - {currency.name}
                      </option>
                    ))}
                  </select>
                  <div className="currency-icon">💱</div>
                </div>
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
