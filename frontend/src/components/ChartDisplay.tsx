import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import type { MonthlySummary, PieDataItem } from "../types";
import { getCategoryColor, isDarkModeEnabled } from "../constants/colors";
import { formatCurrency } from "../utils/currency";

interface ChartDisplayProps {
  summary: MonthlySummary | null;
  loading: boolean;
  selectedMonth: number;
  selectedYear: number;
  selectedCurrency: string;
}

const ChartDisplay: React.FC<ChartDisplayProps> = ({
  summary,
  loading,
  selectedMonth,
  selectedYear,
  selectedCurrency,
}) => {
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

      // Calculate percentage from summary total
      const percentage = ((data.value / summary.total) * 100).toFixed(1);

      return (
        <div className="tooltip">
          <p className="tooltip-label">{data.name}</p>
          <p className="tooltip-value">
            {formatCurrency(data.value, selectedCurrency)}
          </p>
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
                  {preparePieData().map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getCategoryColor(entry.name, isDarkModeEnabled())}
                    />
                  ))}
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
