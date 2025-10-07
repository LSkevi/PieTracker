import React, { useState, useEffect, useRef } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
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

  // Touch tooltip state
  const [touchTooltip, setTouchTooltip] = useState<{
    active: boolean;
    data: { name: string; value: number; percentage: string } | null;
  }>({ active: false, data: null });

  // Show all labels state for touch devices
  const [showAllLabels, setShowAllLabels] = useState(false);

  // Check if device supports touch
  const isTouchDevice = 'ontouchstart' in window;

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

  // Handle clicks outside to close touch tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        touchTooltip.active &&
        chartContainerRef.current &&
        !chartContainerRef.current.contains(event.target as Node)
      ) {
        setTouchTooltip({ active: false, data: null });
      }
    };

    if (touchTooltip.active) {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [touchTooltip.active]);

  // Handle pie slice click/touch
  const handlePieClick = (data: PieDataItem) => {
    // Only handle on touch devices
    if (!("ontouchstart" in window)) return;

    const totalForPercentage = convertedTotal || summary?.total || 0;
    const percentage = ((data.value / totalForPercentage) * 100).toFixed(1);

    // If same slice is already active, hide tooltip
    if (touchTooltip.active && touchTooltip.data?.name === data.name) {
      setTouchTooltip({ active: false, data: null });
      return;
    }

    // Show tooltip for this slice
    setTouchTooltip({
      active: true,
      data: {
        name: data.name,
        value: data.value,
        percentage: percentage,
      },
    });
  };

  const preparePieData = (): PieDataItem[] => {
    if (!summary || !summary.categories) return [];

    return Object.entries(summary.categories).map(([category, amount]) => ({
      name: category,
      value: convertedAmounts[category] || amount,
    }));
  };

  // Prepare yearly spending data for line chart
  const prepareYearlyData = () => {
    const monthlyTotals: { [key: string]: number } = {};

    // Initialize all months with 0
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    months.forEach((month) => {
      monthlyTotals[month] = 0;
    });

    // Calculate monthly totals for the selected year
    expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === selectedYear;
      })
      .forEach((expense) => {
        const expenseDate = new Date(expense.date);
        const monthKey = months[expenseDate.getMonth()];
        monthlyTotals[monthKey] += expense.amount;
      });

    // Convert to chart data format
    return months.map((month) => ({
      month,
      spending: monthlyTotals[month],
    }));
  };

  // Calculate yearly total expenses
  const calculateYearlyTotal = () => {
    const yearlyTotal = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === selectedYear;
      })
      .reduce((total, expense) => total + expense.amount, 0);
    
    return yearlyTotal;
  };

  // Custom tooltip for line chart
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="tooltip">
          <p className="tooltip-label">
            {label} {selectedYear}
          </p>
          <p className="tooltip-value">
            {formatCurrency(data.value, selectedCurrency)}
          </p>
        </div>
      );
    }
    return null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltipWithSummary = (props: any) => {
    const { active, payload } = props;

    // Show touch tooltip if active (takes priority)
    if (touchTooltip.active && touchTooltip.data) {
      return (
        <div className="tooltip">
          <p className="tooltip-label">{touchTooltip.data.name}</p>
          <p className="tooltip-value">
            {formatCurrency(touchTooltip.data.value, selectedCurrency)}
          </p>
          <p className="tooltip-value">
            {touchTooltip.data.percentage}% of total
          </p>
        </div>
      );
    }

    // Show hover tooltip only if not on touch device or no touch tooltip active
    if (
      active &&
      payload &&
      payload.length &&
      summary &&
      !("ontouchstart" in window)
    ) {
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
          
          {/* Show Labels Button for Touch Devices */}
          {isTouchDevice && (
            <button
              className="show-labels-btn"
              onClick={() => setShowAllLabels(!showAllLabels)}
            >
              {showAllLabels ? "Hide Labels" : "Show Labels"}
            </button>
          )}

          <div className="big-chart-area" ref={chartContainerRef}>
            <ResponsiveContainer width="100%" height="100%">
              {/* Margins give breathing room for outside labels */}
              <PieChart margin={{ top: 32, right: 40, bottom: 32, left: 40 }}>
                <Pie
                  data={preparePieData()}
                  cx="50%"
                  cy="50%"
                  outerRadius={chartDimensions.radius}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  onClick={handlePieClick}
                  // Custom label positioned just outside each slice while keeping within padded chart area
                  label={({
                    cx,
                    cy,
                    midAngle,
                    outerRadius,
                    percent,
                    name,
                  }: {
                    cx: number;
                    cy: number;
                    midAngle: number;
                    outerRadius: number;
                    percent: number;
                    name: string;
                  }) => {
                    if (!summary) return null;
                    if (percent * 100 < 2) return null; // skip tiny slices
                    // position slightly outside the slice
                    const RAD = Math.PI / 180;
                    const radius = outerRadius + 18; // push outside but within margins
                    const x = cx + radius * Math.cos(-midAngle * RAD);
                    const y = cy + radius * Math.sin(-midAngle * RAD);
                    const fillColor = getCategoryColor(
                      name,
                      isDarkModeEnabled(),
                      categoryColors
                    );
                    return (
                      <text
                        x={x}
                        y={y}
                        fill={fillColor}
                        textAnchor={x > cx ? "start" : "end"}
                        dominantBaseline="central"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          paintOrder: "stroke",
                          stroke: isDarkModeEnabled() ? "#000" : "var(--paper-white)",
                          strokeWidth: 2,
                          strokeLinejoin: "round",
                        }}
                      >
                        {(percent * 100).toFixed(1)}%
                      </text>
                    );
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

          {/* All Labels Display for Touch Devices */}
          {isTouchDevice && showAllLabels && (
            <div className="all-labels-display">
              <h3>Category Breakdown</h3>
              <div className="labels-grid">
                {preparePieData().map((entry) => {
                  const percentage = convertedTotal > 0 
                    ? ((entry.value / convertedTotal) * 100).toFixed(1) + "%" 
                    : "0%";
                  return (
                    <div key={entry.name} className="label-item">
                      <div
                        className="color-dot"
                        style={{
                          backgroundColor: getCategoryColor(entry.name, isDarkModeEnabled(), categoryColors),
                        }}
                      ></div>
                      <div className="label-info">
                        <div className="label-name">{entry.name}</div>
                        <div className="label-amount">
                          {formatCurrency(entry.value, selectedCurrency)}
                        </div>
                        <div className="label-percentage">{percentage}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="no-data-big">
          No expenses for this month yet.
          <br />
          Start tracking your spending to see your chart!
        </div>
      )}

      {/* Yearly Spending Trends Panel - Always show when there's a summary */}
      <div className="big-chart-container yearly-trends-container">
        <div className="month-display">
          <span className="month-text">{selectedYear}</span>
        </div>
        <div className="chart-title">Yearly Spending Trends</div>
        
        {/* Yearly Total Display */}
        <div className="yearly-total-display">
          <div className="yearly-total-label">Total {selectedYear} Expenses:</div>
          <div className="yearly-total-amount">
            {formatCurrency(calculateYearlyTotal(), selectedCurrency)}
          </div>
        </div>

        <div className="big-chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={prepareYearlyData()}
              margin={{ top: 32, right: 40, bottom: 32, left: 40 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--warm-gray)"
                opacity={0.3}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "var(--charcoal)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              />
              <YAxis
                domain={[0, 3000]}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "var(--charcoal)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={LineTooltip} />
              <Line
                type="monotone"
                dataKey="spending"
                stroke="var(--sage-green)"
                strokeWidth={3}
                dot={{
                  fill: "var(--sage-green)",
                  strokeWidth: 2,
                  stroke: "var(--paper-white)",
                  r: 6,
                }}
                activeDot={{
                  r: 8,
                  stroke: "var(--sage-green)",
                  strokeWidth: 3,
                  fill: "var(--paper-white)",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
};

export default ChartDisplay;
