import React, { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import type { MonthlySummary, PieDataItem, Expense } from "../types";
import { getCategoryColor, isDarkModeEnabled } from "../constants/colors";
import { formatCurrency, convertCurrency } from "../utils/currency";

interface ChartDisplayProps {
  summary: MonthlySummary | null;
  expenses: Expense[];
  loading: boolean;
  selectedMonth: number;
  selectedYear: number;
  selectedCurrency: string;
  categoryColors?: { [key: string]: string };
}

const ChartDisplay: React.FC<ChartDisplayProps> = ({
  summary,
  expenses,
  loading,
  selectedMonth,
  selectedYear,
  selectedCurrency,
  categoryColors,
}) => {
  const [convertedAmounts, setConvertedAmounts] = useState<{
    [key: string]: number;
  }>({});
  const [convertedTotal, setConvertedTotal] = useState<number>(0);
  const [chartDimensions, setChartDimensions] = useState({
    width: 500,
    height: 500,
    radius: 150,
  });

  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Convert amounts when currency or data changes
  useEffect(() => {
    const convertAmounts = async () => {
      if (!summary || !expenses.length) return;

      // Calculate totals by converting each expense individually
      let totalInTargetCurrency = 0;
      const categoryTotals: { [key: string]: number } = {};

      // Convert each expense from its original currency to target currency
      for (const expense of expenses) {
        const fromCurrency = expense.currency || "CAD";
        const convertedAmount = await convertCurrency(
          expense.amount,
          fromCurrency,
          selectedCurrency
        );

        totalInTargetCurrency += convertedAmount;

        // Add to category total
        if (!categoryTotals[expense.category]) {
          categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += convertedAmount;
      }

      // Store converted totals
      setConvertedTotal(totalInTargetCurrency);
      setConvertedAmounts(categoryTotals);
    };

    convertAmounts();
  }, [summary, selectedCurrency, expenses]);

  // Handle dynamic sizing based on container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (chartContainerRef.current) {
        const container = chartContainerRef.current;
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;

        // Calculate optimal dimensions with padding for labels
        const padding = 60; // Space for labels and legend
        const maxRadius = Math.min(
          (containerWidth - padding * 2) / 2,
          (containerHeight - padding * 2) / 2
        );

        setChartDimensions({
          width: containerWidth,
          height: containerHeight,
          radius: Math.max(50, maxRadius), // Ensure chart is visible and usable
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const preparePieData = (): PieDataItem[] => {
    if (!summary || !summary.categories) return [];

    return Object.entries(summary.categories).map(([category, amount]) => ({
      name: category,
      value: convertedAmounts[category] || amount,
    }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltipWithSummary = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length && summary) {
      const data = payload[0];

      // Calculate percentage from converted total
      const totalForPercentage = convertedTotal || summary.total;
      const percentage = ((data.value / totalForPercentage) * 100).toFixed(1);

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
          <div className="big-chart-area" ref={chartContainerRef}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={preparePieData()}
                  cx="50%"
                  cy="50%"
                  outerRadius={chartDimensions.radius}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ value }: { value: number }) => {
                    if (!summary) return "";
                    const totalForPercentage = convertedTotal || summary.total;
                    const percentage = (
                      (value / totalForPercentage) *
                      100
                    ).toFixed(1);
                    return `${percentage}%`;
                  }}
                >
                  {preparePieData().map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getCategoryColor(
                        entry.name,
                        isDarkModeEnabled(),
                        categoryColors
                      )}
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
