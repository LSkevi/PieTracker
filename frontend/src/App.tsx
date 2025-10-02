import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import ExpenseForm from "./components/ExpenseForm";
import ChartDisplay from "./components/ChartDisplay";
import InfoPanel from "./components/InfoPanel";
import ThemeToggle from "./components/ThemeToggle";
import { useExpenses } from "./hooks/useExpenses";
import { formatCurrency, convertCurrency } from "./utils/currency";
import "./App.css";

// Simple error boundary for debugging
const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("App error:", error);
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>Check the console for errors</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const {
    expenses,
    summary,
    categories,
    categoryColors,
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    availableMonths,
    selectedMonth,
    selectedYear,
    loading,
    addExpense,
    addCategory,
    deleteExpense,
    deleteCategory,
    setMonthYear,
  } = useExpenses();

  // Debug logging for production
  useEffect(() => {
    console.log("App mounted, loading:", loading);
    console.log("API Base:", import.meta.env.VITE_API_URL || "fallback");
    console.log("Environment:", import.meta.env.MODE);
  }, [loading]);

  const [convertedTotal, setConvertedTotal] = useState<number>(0);

  // Convert total amount when currency or data changes
  useEffect(() => {
    const convertTotal = async () => {
      if (!summary || !expenses.length) return;

      // Calculate total by converting each expense individually
      let totalInTargetCurrency = 0;
      for (const expense of expenses) {
        const fromCurrency = expense.currency || "CAD";
        const convertedAmount = await convertCurrency(
          expense.amount,
          fromCurrency,
          selectedCurrency
        );
        totalInTargetCurrency += convertedAmount;
      }

      setConvertedTotal(totalInTargetCurrency);
    };

    convertTotal();
  }, [summary, selectedCurrency, expenses]);

  return (
    <div className="app">
      <ThemeToggle />
      <Header />

      <div className="main-container-new">
        {/* Add Expenses Section - No longer collapsible */}
        <div className="expense-section">
          <div className="expense-form-container">
            <ExpenseForm
              categories={categories}
              categoryColors={categoryColors}
              currencies={currencies}
              selectedCurrency={selectedCurrency}
              expenses={expenses}
              onAddExpense={addExpense}
              onAddCategory={addCategory}
              onDeleteExpense={deleteExpense}
              onDeleteCategory={deleteCategory}
              onCurrencyChange={setSelectedCurrency}
            />
          </div>
        </div>

        {/* Charts and Info Panel Side by Side */}
        <div className="charts-info-section">
          {/* Spending Insights Banner */}
          {summary && summary.total > 0 && (
            <div className="insights-banner">
              <div className="insight-item">
                <span className="insight-label">Daily Average</span>
                <span className="insight-value">
                  {formatCurrency(
                    (convertedTotal || summary.total) / 30,
                    selectedCurrency
                  )}
                </span>
              </div>
              <div className="insight-item">
                <span className="insight-label">Top Category</span>
                <span className="insight-value">
                  {Object.entries(summary.categories || {}).sort(
                    ([, a], [, b]) => b - a
                  )[0]?.[0] || "None"}
                </span>
              </div>
              <div className="insight-item">
                <span className="insight-label">Total Expenses</span>
                <span className="insight-value">{summary.expense_count}</span>
              </div>
            </div>
          )}

          {/* Chart and Info Side by Side */}
          <div className="chart-info-layout">
            <div className="chart-area">
              {loading ? (
                <div className="loading">Loading data...</div>
              ) : summary ? (
                <ChartDisplay
                  summary={summary}
                  expenses={expenses}
                  loading={loading}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  selectedCurrency={selectedCurrency}
                  categoryColors={categoryColors}
                />
              ) : (
                <div className="no-data-section">
                  <h3>No data available</h3>
                  <p>Add some expenses to get started!</p>
                </div>
              )}
            </div>

            <div className="info-area">
              <InfoPanel
                summary={summary}
                expenses={expenses}
                availableMonths={availableMonths}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                selectedCurrency={selectedCurrency}
                currencies={currencies}
                onMonthYearChange={setMonthYear}
                onCurrencyChange={setSelectedCurrency}
                categoryColors={categoryColors}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
