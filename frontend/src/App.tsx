import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import ExpenseForm from "./components/ExpenseForm";
import ChartDisplay from "./components/ChartDisplay";
import InfoPanel from "./components/InfoPanel";
import ThemeToggle from "./components/ThemeToggle";
import { useExpenses } from "./hooks/useExpenses";
import { formatCurrency, convertCurrency } from "./utils/currency";
import "./App.css";

const App: React.FC = () => {
  const {
    expenses,
    summary,
    categories,
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    availableMonths,
    selectedMonth,
    selectedYear,
    loading,
    addExpense,
    deleteExpense,
    deleteCategory,
    setMonthYear,
  } = useExpenses();

  const [convertedTotal, setConvertedTotal] = useState<number>(0);

  // Convert total amount when currency or data changes
  useEffect(() => {
    const convertTotal = async () => {
      if (!summary) return;
      const converted = await convertCurrency(
        summary.total,
        "USD",
        selectedCurrency
      );
      setConvertedTotal(converted);
    };

    convertTotal();
  }, [summary, selectedCurrency]);

  return (
    <div className="app">
      <ThemeToggle />
      <Header />

      <div className="main-container-new">
        {/* Add Expenses Section - No longer collapsible */}
        <div className="expense-section">
          <div className="expense-section-header">
            <h2>Add Expenses</h2>
          </div>

          <div className="expense-form-container">
            <ExpenseForm
              categories={categories}
              currencies={currencies}
              selectedCurrency={selectedCurrency}
              expenses={expenses}
              onAddExpense={addExpense}
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
                  loading={loading}
                  selectedMonth={selectedMonth}
                  selectedYear={selectedYear}
                  selectedCurrency={selectedCurrency}
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
