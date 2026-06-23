import React, { useState, useEffect } from "react";
import ExpenseForm from "./components/ExpenseForm";
import ChartDisplay from "./components/ChartDisplay";
import InfoPanel from "./components/InfoPanel";
import ThemeToggle from "./components/ThemeToggle";
import StyleToggle from "./components/StyleToggle";
import FallingLeaves from "./components/FallingLeaves";
import AdminDashboard from "./components/AdminPanel";
import AuthContainer from "./components/auth/AuthContainer";
import { AuthProvider } from "./contexts/AuthContext";
import { StyleProvider } from "./contexts/StyleContext";
import { useAuth } from "./hooks/useAuth";
import { useStyle } from "./hooks/useStyle";
import { useExpenses } from "./hooks/useExpenses";
import { formatCurrency, convertCurrency } from "./utils/currency";
import "./App.css";

// Error boundary that catches errors thrown during React rendering
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <h1>Something went wrong</h1>
          <p>Check the console for errors</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AuthenticatedApp: React.FC = () => {
  const { logout, user } = useAuth();
  const { style } = useStyle();
  const {
    expenses,
    yearlyExpenses,
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
    loadingYearly,
    initialLoading,
    addExpense,
    addCategory,
    deleteExpense,
    deleteCategory,
    setMonthYear,
  } = useExpenses();

  const [convertedTotal, setConvertedTotal] = useState<number>(0);
  const [currentView, setCurrentView] = useState<"dashboard" | "admin">(
    "dashboard"
  );

  // Check if user is admin
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="app">
      {/* Falling leaves background for main menu (casual style only) */}
      {style === "casual" && <FallingLeaves />}

      {/* User Header with Title, Theme + Logout */}
      <div className="user-header">
        <div className="user-header-left">
          <span className="user-greeting">Welcome, {user?.username}!</span>
          {isAdmin && (
            <div className="admin-nav">
              <button
                onClick={() => setCurrentView("dashboard")}
                className={`nav-btn ${
                  currentView === "dashboard" ? "active" : ""
                }`}
              >
                {style === "casual" ? "📊 " : ""}Dashboard
              </button>
              <button
                onClick={() => setCurrentView("admin")}
                className={`nav-btn ${currentView === "admin" ? "active" : ""}`}
              >
                {style === "casual" ? "🛡️ " : ""}Admin Panel
              </button>
            </div>
          )}
        </div>
        <div className="user-header-center">
          <h1 className="header-title">
            <span className="title-text">PieTracker</span>
          </h1>
        </div>
        <div className="user-header-actions">
          <StyleToggle />
          <ThemeToggle />
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      {summary && summary.total > 0 && (
        <div className="insights-banner insights-banner-global">
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

      {currentView === "admin" ? (
        <AdminDashboard />
      ) : (
        <div className="main-container-new">
          {/* Add Expenses Section */}
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

          {/* Charts and Info Panel */}
          <div className="charts-info-section">
            {/* Chart and Info Side by Side */}
            <div className="chart-info-layout">
              <div className="chart-area">
                {loading || initialLoading ? (
                  <div className="enhanced-loading">
                    <div className="loading-spinner">
                      <div className="spinner-circle"></div>
                    </div>
                    <div className="loading-text">Loading data...</div>
                  </div>
                ) : summary ? (
                  <ChartDisplay
                    summary={summary}
                    expenses={expenses}
                    yearlyExpenses={yearlyExpenses}
                    loading={loading}
                    loadingYearly={loadingYearly}
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
                  loading={loading || initialLoading}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AppWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <StyleProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </StyleProvider>
  </ErrorBoundary>
);

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { style } = useStyle();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <h1>{style === "casual" ? "🥧 " : ""}PieTracker</h1>
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedApp /> : <AuthContainer />;
};

export default AppWithErrorBoundary;
