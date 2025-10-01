import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import type { Expense, MonthlySummary } from "../types";
import { getCategoryColor, isDarkModeEnabled } from "../constants/colors";
import { formatCurrency } from "../utils/currency";

interface InfoPanelProps {
  summary: MonthlySummary | null;
  expenses: Expense[];
  availableMonths: { year: number; month: number; year_month: string }[];
  selectedMonth: number;
  selectedYear: number;
  selectedCurrency: string;
  onMonthYearChange: (month: number, year: number) => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  summary,
  expenses,
  availableMonths,
  selectedMonth,
  selectedYear,
  selectedCurrency,
  onMonthYearChange,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(() => isDarkModeEnabled());

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

  const preparePieData = () => {
    if (!summary || !summary.categories) return [];

    return Object.entries(summary.categories).map(([category, amount]) => ({
      name: category,
      value: amount,
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
            <div className="total-amount">
              {formatCurrency(summary.total, selectedCurrency)}
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
                      {formatCurrency(item.value, selectedCurrency)}
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
                </div>
                <span className="expense-amount">
                  {formatCurrency(
                    expenses[0].amount,
                    expenses[0].currency || selectedCurrency
                  )}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InfoPanel;
