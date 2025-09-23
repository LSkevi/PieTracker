import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import type { MonthlySummary, PieDataItem } from "../types";

interface ChartDisplayProps {
  summary: MonthlySummary | null;
  loading: boolean;
  selectedMonth: number;
  selectedYear: number;
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

const ChartDisplay: React.FC<ChartDisplayProps> = ({
  summary,
  loading,
  selectedMonth,
  selectedYear,
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
  const getChartColors = () => {
    return isDarkMode ? DARK_MODE_COLORS : ELEGANT_COLORS;
  };

  const preparePieData = (): PieDataItem[] => {
    if (!summary || !summary.categories) return [];

    return Object.entries(summary.categories).map(([category, amount]) => ({
      name: category,
      value: amount,
    }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltipWithSummary = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length && summary) {
      const data = payload[0];
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-CA", {
          style: "currency",
          currency: "CAD",
        }).format(amount);
      };

      // Calculate percentage from summary total
      const percentage = ((data.value / summary.total) * 100).toFixed(1);

      return (
        <div className="tooltip">
          <p className="tooltip-label">{data.name}</p>
          <p className="tooltip-value">{formatCurrency(data.value)}</p>
          <p className="tooltip-value">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  if (!summary) {
    return <div className="no-data">Select a month to view your spending</div>;
  }

  return (
    <>
      {Object.keys(summary.categories).length > 0 ? (
        <div className="big-chart-container">
          {/* Beautiful Month Display */}
          <div className="month-display">
            <span className="month-text">
              {format(
                new Date(selectedYear, selectedMonth - 1, 1),
                "MMMM yyyy",
                { locale: enUS }
              )}
            </span>
          </div>
          <div className="chart-title">Spending by Category</div>
          <div className="big-chart-area">
            <ResponsiveContainer width="100%" height={600}>
              <PieChart>
                <Pie
                  data={preparePieData()}
                  cx="50%"
                  cy="50%"
                  outerRadius={200}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ value }: { value: number }) => {
                    if (!summary) return "";
                    const percentage = ((value / summary.total) * 100).toFixed(
                      1
                    );
                    return `${percentage}%`;
                  }}
                >
                  {preparePieData().map((_, index) => {
                    const colors = getChartColors();
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={colors[index % colors.length]}
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={CustomTooltipWithSummary} offset={20} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="no-data-big">
          No expenses for this month yet.
          <br />
          Start tracking your spending to see your chart!
        </div>
      )}
    </>
  );
};

export default ChartDisplay;
