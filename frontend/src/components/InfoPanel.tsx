import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import type { Expense, MonthlySummary } from "../types";

interface InfoPanelProps {
  summary: MonthlySummary | null;
  expenses: Expense[];
  selectedMonth: number;
  selectedYear: number;
  onMonthYearChange: (month: number, year: number) => void;
}

const ELEGANT_COLORS = [
  "#7ba098",
  "#a8b5a0",
  "#d4b5a0",
  "#c7c0b8",
  "#9fb3a3",
  "#b8c5b8",
  "#d1c4b0",
  "#a8a8a8",
  "#95a5a6",
  "#8fb3a3",
];

const DARK_MODE_COLORS = [
  "#5c7a73",
  "#7a8c6f",
  "#a08970",
  "#6b645b",
  "#7a9380",
  "#8fa38f",
  "#a89e87",
  "#7d7d7d",
  "#6b7b7c",
  "#6b8a7a",
];

const InfoPanel: React.FC<InfoPanelProps> = ({
  summary,
  expenses,
  selectedMonth,
  selectedYear,
  onMonthYearChange,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      setIsDarkMode(isDark);
    };

    checkTheme();

    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  // Function to get current theme colors
  const getLegendColors = () => {
    return isDarkMode ? DARK_MODE_COLORS : ELEGANT_COLORS;
  };
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

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
          {months.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={handleYearSelectChange}
          className="month-picker"
        >
          {years.map((year) => (
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
            <div className="total-amount">{formatCurrency(summary.total)}</div>
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
              {preparePieData().map((item, index) => (
                <div key={item.name} className="legend-item-vertical">
                  <div
                    className="legend-color"
                    style={{
                      backgroundColor:
                        getLegendColors()[index % getLegendColors().length],
                    }}
                  ></div>
                  <div className="legend-text-vertical">
                    <span className="legend-category">{item.name}</span>
                    <span className="legend-amount">
                      {formatCurrency(item.value)}
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
                  {formatCurrency(expenses[0].amount)}
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
