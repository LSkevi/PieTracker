import React from "react";
import Header from "./components/Header";
import ExpenseForm from "./components/ExpenseForm";
import ChartDisplay from "./components/ChartDisplay";
import InfoPanel from "./components/InfoPanel";
import { useExpenses } from "./hooks/useExpenses";
import "./App.css";

const App: React.FC = () => {
  const {
    expenses,
    summary,
    categories,
    selectedMonth,
    selectedYear,
    loading,
    addExpense,
    deleteExpense,
    setMonthYear,
  } = useExpenses();

  return (
    <div className="app">
      <Header selectedMonth={selectedMonth} selectedYear={selectedYear} />

      <div className="main-container">
        <ExpenseForm
          categories={categories}
          expenses={expenses}
          onAddExpense={addExpense}
          onDeleteExpense={deleteExpense}
        />

        <div className="right-panel">
          {loading ? (
            <div className="loading">Loading data...</div>
          ) : summary ? (
            <div className="chart-info-layout">
              <ChartDisplay summary={summary} loading={loading} />

              <InfoPanel
                summary={summary}
                expenses={expenses}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthYearChange={setMonthYear}
              />
            </div>
          ) : (
            <div className="no-data">Select a month to view your spending</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
