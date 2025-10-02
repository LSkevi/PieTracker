import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import type { ExpenseFormData, Expense, Currency } from "../types";
import {
  formatCurrency,
  convertCurrency,
  getCacheStatus,
} from "../utils/currency";
import { getCategoryColor, isDarkModeEnabled } from "../constants/colors";

interface ExpenseFormProps {
  categories: string[];
  currencies: Currency[];
  selectedCurrency: string;
  expenses: Expense[];
  onAddExpense: (
    amount: number,
    category: string,
    description: string,
    currency: string,
    date: string
  ) => void;
  onDeleteExpense: (expenseId: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  onCurrencyChange: (currency: string) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  categories,
  currencies,
  selectedCurrency,
  expenses,
  onAddExpense,
  onDeleteExpense,
  onDeleteCategory,
  onCurrencyChange,
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [customCategoryColor, setCustomCategoryColor] = useState("#a8b5a0");
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(false);
  const [conversionMessage, setConversionMessage] = useState("");
  const [rateStatus, setRateStatus] = useState<string>("");
  const [formData, setFormData] = useState<ExpenseFormData & { date: string }>({
    amount: "",
    category: "",
    description: "",
    currency: selectedCurrency,
    date: format(new Date(), "yyyy-MM-dd"),
  });

  // State for converted expense amounts in the list
  const [convertedExpenseAmounts, setConvertedExpenseAmounts] = useState<{
    [key: string]: number;
  }>({});

  // Convert expense amounts when currency or expenses change
  useEffect(() => {
    const convertExpenseAmounts = async () => {
      const converted: { [key: string]: number } = {};

      for (const expense of expenses) {
        const fromCurrency = expense.currency || "USD";
        if (fromCurrency !== selectedCurrency) {
          try {
            const convertedAmount = await convertCurrency(
              expense.amount,
              fromCurrency,
              selectedCurrency
            );
            converted[expense.id] = convertedAmount;
          } catch (error) {
            console.error("Failed to convert expense amount:", error);
            // Fallback to original amount if conversion fails
            converted[expense.id] = expense.amount;
          }
        } else {
          // Same currency, no conversion needed
          converted[expense.id] = expense.amount;
        }
      }

      setConvertedExpenseAmounts(converted);
    };

    if (expenses.length > 0) {
      convertExpenseAmounts();
    }
  }, [expenses, selectedCurrency]);

  // Keep form currency in sync with global currency selection
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      currency: selectedCurrency,
    }));
  }, [selectedCurrency]);

  // Handle escape key for closing modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showCustomCategory) {
        setShowCustomCategory(false);
        setCustomCategory("");
        setCustomCategoryColor("#a8b5a0");
      }
    };

    if (showCustomCategory) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [showCustomCategory]);

  // Update rate status on component mount
  useEffect(() => {
    const status = getCacheStatus();
    if (status.hasCache) {
      setRateStatus(`Rates updated: ${status.lastUpdate}`);
    } else {
      setRateStatus("Fetching exchange rates...");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      formData.amount &&
      formData.category &&
      formData.description &&
      formData.currency &&
      formData.date
    ) {
      onAddExpense(
        parseFloat(formData.amount),
        formData.category,
        formData.description,
        formData.currency,
        formData.date
      );

      // Show success feedback
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      setFormData((prev) => ({
        ...prev,
        amount: "",
        category: "",
        description: "",
      }));
    }
  };

  const handleChange = async (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    // If currency changes and there's an amount, convert it
    if (name === "currency" && formData.amount && formData.currency !== value) {
      const currentAmount = parseFloat(formData.amount);
      if (!isNaN(currentAmount)) {
        try {
          const convertedAmount = await convertCurrency(
            currentAmount,
            formData.currency,
            value
          );
          setFormData((prev) => ({
            ...prev,
            amount: convertedAmount.toString(),
            currency: value,
          }));

          // Show conversion message
          setConversionMessage(
            `💱 Converted ${formatCurrency(
              currentAmount,
              formData.currency
            )} to ${formatCurrency(convertedAmount, value)}`
          );
          setTimeout(() => setConversionMessage(""), 3000);

          onCurrencyChange(value);
          return;
        } catch (error) {
          console.error("Currency conversion failed:", error);
        }
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // If currency changes, update the global currency selection
    if (name === "currency") {
      onCurrencyChange(value);
    }
  };

  // Handle category deletion
  const handleDeleteCategory = async (categoryToDelete: string) => {
    // Don't allow deletion of default categories
    if (
      ["Food", "Transportation", "Shopping", "Entertainment"].includes(
        categoryToDelete
      )
    ) {
      return;
    }

    // If the deleted category was selected, clear the selection
    if (formData.category === categoryToDelete) {
      setFormData((prev) => ({ ...prev, category: "" }));
    }

    if (
      window.confirm(
        `Are you sure you want to delete the "${categoryToDelete}" category?`
      )
    ) {
      try {
        await onDeleteCategory(categoryToDelete);
      } catch (error) {
        // Show error message from backend
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        alert(`Error deleting category: ${errorMessage}`);
      }
    }
  };

  return (
    <div className="expense-form-tab">
      <div className="expense-form-header">
        <h2>Add New Expense</h2>
        <p className="form-subtitle">Track your spending with style</p>
      </div>

      {/* Category Toggle Buttons */}
      <div className="category-selection-section">
        <div className="category-buttons-grid">
          {/* Fixed categories always come first */}
          {["Food", "Transportation", "Shopping", "Entertainment"].map(
            (category) => (
              <button
                key={category}
                type="button"
                className={`category-toggle-btn ${
                  formData.category === category ? "selected" : ""
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, category }))}
                style={{
                  backgroundColor:
                    formData.category === category
                      ? getCategoryColor(category, isDarkModeEnabled())
                      : "transparent",
                  borderColor: getCategoryColor(category, isDarkModeEnabled()),
                  color:
                    formData.category === category
                      ? "white"
                      : getCategoryColor(category, isDarkModeEnabled()),
                }}
              >
                {category}
              </button>
            )
          )}

          {/* Custom categories with delete buttons */}
          {categories
            .filter(
              (cat) =>
                ![
                  "Food",
                  "Transportation",
                  "Shopping",
                  "Entertainment",
                ].includes(cat)
            )
            .map((category) => (
              <div key={category} className="custom-category-wrapper">
                <button
                  type="button"
                  className={`category-toggle-btn custom-category ${
                    formData.category === category ? "selected" : ""
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, category }))}
                  style={{
                    backgroundColor:
                      formData.category === category
                        ? getCategoryColor(category, isDarkModeEnabled())
                        : "transparent",
                    borderColor: getCategoryColor(
                      category,
                      isDarkModeEnabled()
                    ),
                    color:
                      formData.category === category
                        ? "white"
                        : getCategoryColor(category, isDarkModeEnabled()),
                  }}
                >
                  {category}
                </button>
                {formData.category !== category && (
                  <button
                    type="button"
                    className="delete-category-btn"
                    onClick={() => handleDeleteCategory(category)}
                    title={`Delete ${category} category`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

          {/* Add new category button */}
          <button
            type="button"
            className="add-category-toggle-btn"
            onClick={() => setShowCustomCategory(true)}
          >
            + Add Category
          </button>
        </div>

        {/* Custom category modal */}
        {showCustomCategory && (
          <div className="custom-category-modal">
            <div className="custom-category-content">
              <h4>Add New Category</h4>

              <div className="category-form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter category name"
                  className="category-name-input"
                  autoFocus
                />
              </div>

              <div className="category-form-group">
                <label>Category Color</label>
                <div className="color-picker-group">
                  <input
                    type="color"
                    value={customCategoryColor}
                    onChange={(e) => setCustomCategoryColor(e.target.value)}
                    className="color-picker"
                  />
                  <span
                    className="color-preview"
                    style={{ backgroundColor: customCategoryColor }}
                  ></span>
                </div>
              </div>

              <div className="custom-category-buttons">
                <button
                  type="button"
                  onClick={() => {
                    if (customCategory.trim()) {
                      setFormData((prev) => ({
                        ...prev,
                        category: customCategory.trim(),
                      }));
                      setShowCustomCategory(false);
                      setCustomCategory("");
                      setCustomCategoryColor("#a8b5a0");
                    }
                  }}
                  className="btn-custom-add"
                  disabled={!customCategory.trim()}
                >
                  Add Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomCategory(false);
                    setCustomCategory("");
                    setCustomCategoryColor("#a8b5a0");
                  }}
                  className="btn-custom-cancel"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="expense-form">
        <div className="form-row">
          <div className="form-group">
            <label>Amount</label>
            <div className="amount-currency-group">
              <input
                type="number"
                name="amount"
                step="0.01"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="currency-select"
                required
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} ({currency.symbol})
                  </option>
                ))}
              </select>
            </div>
            {rateStatus && <div className="rate-status">{rateStatus}</div>}
            {conversionMessage && (
              <div className="conversion-message">💱 {conversionMessage}</div>
            )}
          </div>

          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder={
              formData.category
                ? `What ${formData.category.toLowerCase()} did you buy?`
                : "What did you spend on?"
            }
            required
            list="description-suggestions"
          />
          <datalist id="description-suggestions">
            {formData.category === "Food" && (
              <>
                <option value="Restaurant meal" />
                <option value="Groceries" />
                <option value="Coffee" />
                <option value="Takeout" />
              </>
            )}
            {formData.category === "Transportation" && (
              <>
                <option value="Gas" />
                <option value="Uber/Taxi" />
                <option value="Public transit" />
                <option value="Parking" />
              </>
            )}
          </datalist>
        </div>

        <button type="submit" className="btn-primary-large">
          Add Expense
        </button>

        {/* Success Message */}
        {showSuccess && (
          <div className="success-message">✅ Expense added successfully!</div>
        )}
      </form>

      {/* Expenses */}
      <div className="expenses-list-tab">
        <div className="expenses-header">
          <h3 className="recent-expenses-title">Expenses</h3>
          <div className="expenses-controls">
            <span className="expense-count">{expenses.length} items</span>
            {expenses.length > 0 && (
              <button
                type="button"
                className="expand-toggle-btn"
                onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
              >
                {isExpensesExpanded ? "Show Less" : "Show All"}
              </button>
            )}
          </div>
        </div>
        {expenses.length === 0 ? (
          <div className="no-data">No expenses yet this month</div>
        ) : (
          <div className="expenses-grid">
            {(isExpensesExpanded ? expenses : expenses.slice(0, 6)).map(
              (expense) => (
                <div key={expense.id} className="expense-card">
                  <div className="expense-card-header">
                    <h4>{expense.description}</h4>
                    <button
                      onClick={() => onDeleteExpense(expense.id)}
                      className="delete-btn-card"
                    >
                      ×
                    </button>
                  </div>
                  <div className="expense-card-details">
                    <span className="expense-category">{expense.category}</span>
                    <span className="expense-date">{expense.date}</span>
                    <span className="expense-amount-card">
                      {formatCurrency(
                        convertedExpenseAmounts[expense.id] || expense.amount,
                        selectedCurrency
                      )}
                    </span>
                    {(expense.currency || "USD") !== selectedCurrency && (
                      <span className="expense-original-currency">
                        Originally:{" "}
                        {formatCurrency(
                          expense.amount,
                          expense.currency || "USD"
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
        {!isExpensesExpanded && expenses.length > 6 && (
          <div className="show-more-expenses">
            <p>And {expenses.length - 6} more expenses...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseForm;
