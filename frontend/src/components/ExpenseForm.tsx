import React, { useState, useEffect, useRef } from "react";
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
  categoryColors: { [key: string]: string };
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
  onAddCategory: (
    categoryName: string,
    categoryColor: string
  ) => Promise<boolean>;
  onDeleteExpense: (expenseId: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  onCurrencyChange: (currency: string) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  categories,
  categoryColors,
  currencies,
  selectedCurrency,
  expenses,
  onAddExpense,
  onAddCategory,
  onDeleteExpense,
  onDeleteCategory,
  onCurrencyChange,
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [customCategoryColor, setCustomCategoryColor] = useState("#a8b5a0");
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [conversionMessage, setConversionMessage] = useState("");
  const [rateStatus, setRateStatus] = useState<string>("");

  // Confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string>("");

  // Date input ref for custom picker
  const dateInputRef = useRef<HTMLInputElement>(null);

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
        const fromCurrency = expense.currency || "CAD";
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

    // Reset previous error
    setShowError(false);
    setErrorMessage("");

    // Validation with English error messages
    if (!formData.amount) {
      setErrorMessage("Please enter an amount");
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    if (!formData.category) {
      setErrorMessage("Please select a category");
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    // Description is now optional - no validation needed

    if (!formData.currency) {
      setErrorMessage("Please select a currency");
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    if (!formData.date) {
      setErrorMessage("Please select a date");
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    // If all validation passes, submit the expense
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

  // Handle date picker click
  const handleDatePickerClick = () => {
    if (dateInputRef.current) {
      try {
        // Try to use the modern showPicker API first
        if (
          "showPicker" in dateInputRef.current &&
          typeof dateInputRef.current.showPicker === "function"
        ) {
          dateInputRef.current.showPicker();
        } else {
          // Fallback to focus and click for older browsers
          dateInputRef.current.focus();
          dateInputRef.current.click();
        }
      } catch {
        // Last resort fallback
        dateInputRef.current.focus();
      }
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

    // Show confirmation modal
    setCategoryToDelete(categoryToDelete);
    setShowDeleteConfirm(true);
  };

  // Confirm category deletion
  const confirmDeleteCategory = async () => {
    // If the deleted category was selected, clear the selection
    if (formData.category === categoryToDelete) {
      setFormData((prev) => ({ ...prev, category: "" }));
    }

    try {
      await onDeleteCategory(categoryToDelete);
      setShowDeleteConfirm(false);
      setCategoryToDelete("");
    } catch (error) {
      // Show error message from backend
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Error deleting category: ${errorMessage}`);
    }
  };

  // Cancel category deletion
  const cancelDeleteCategory = () => {
    setShowDeleteConfirm(false);
    setCategoryToDelete("");
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
                      ? getCategoryColor(
                          category,
                          isDarkModeEnabled(),
                          categoryColors
                        )
                      : "transparent",
                  borderColor: getCategoryColor(
                    category,
                    isDarkModeEnabled(),
                    categoryColors
                  ),
                  color:
                    formData.category === category
                      ? "white"
                      : getCategoryColor(
                          category,
                          isDarkModeEnabled(),
                          categoryColors
                        ),
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
                        ? getCategoryColor(
                            category,
                            isDarkModeEnabled(),
                            categoryColors
                          )
                        : "transparent",
                    borderColor: getCategoryColor(
                      category,
                      isDarkModeEnabled(),
                      categoryColors
                    ),
                    color:
                      formData.category === category
                        ? "white"
                        : getCategoryColor(
                            category,
                            isDarkModeEnabled(),
                            categoryColors
                          ),
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
                  onClick={async () => {
                    if (customCategory.trim()) {
                      const success = await onAddCategory(
                        customCategory.trim(),
                        customCategoryColor
                      );
                      if (success) {
                        // Select the newly added category
                        setFormData((prev) => ({
                          ...prev,
                          category: customCategory.trim(),
                        }));
                        setShowCustomCategory(false);
                        setCustomCategory("");
                        setCustomCategoryColor("#a8b5a0");
                      } else {
                        setErrorMessage(
                          "Failed to add category. Please try again."
                        );
                        setShowError(true);
                        setTimeout(() => setShowError(false), 3000);
                      }
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
            <input
              type="number"
              name="amount"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label>Currency</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="currency-select"
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} ({currency.symbol})
                </option>
              ))}
            </select>
            {rateStatus && <div className="rate-status">{rateStatus}</div>}
            {conversionMessage && (
              <div className="conversion-message">💱 {conversionMessage}</div>
            )}
          </div>

          <div className="form-group">
            <label>Date</label>
            <div className="date-input-wrapper">
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="date-input-hidden"
                ref={dateInputRef}
              />
              <div
                className="date-input-display"
                onClick={handleDatePickerClick}
              >
                <span className="date-value">
                  {formData.date
                    ? format(new Date(formData.date), "dd/MM/yyyy")
                    : "Select date"}
                </span>
                <span className="calendar-icon">📅</span>
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Description (Optional)</label>
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

        {/* Error Message */}
        {showError && <div className="error-message">⚠️ {errorMessage}</div>}
      </form>

      {/* Expenses */}
      <div className="expenses-list-tab">
        <div className="expenses-header">
          <h3 className="recent-expenses-title">Expenses</h3>
          <div className="expenses-controls">
            {expenses.length > 0 && (
              <>
                <span className="expense-count">
                  {(() => {
                    const filteredExpenses = expenses.filter(
                      (expense) =>
                        expense.description
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()) ||
                        expense.category
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                    );
                    return searchTerm
                      ? `${filteredExpenses.length} of ${expenses.length}`
                      : `${expenses.length} items`;
                  })()}
                </span>
                <button
                  type="button"
                  className="expand-toggle-btn"
                  onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
                >
                  {isExpensesExpanded ? "Show Less" : "Show All"}
                </button>
              </>
            )}
          </div>
        </div>
        {expenses.length > 0 && (
          <div className="expenses-search-section">
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="expense-search-input"
            />
          </div>
        )}
        {expenses.length === 0 ? (
          <div className="no-data">No expenses yet this month</div>
        ) : (
          <div className="expenses-grid">
            {(() => {
              const filteredExpenses = expenses.filter(
                (expense) =>
                  expense.description
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                  expense.category
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
              );
              const displayExpenses = isExpensesExpanded
                ? filteredExpenses
                : filteredExpenses.slice(0, 3);

              return displayExpenses.map((expense) => (
                <div key={expense.id} className="expense-card-simple">
                  <div className="expense-card-main">
                    <div className="expense-date-simple">
                      {format(new Date(expense.date), "dd/MM/yyyy")}
                    </div>
                    <div className="expense-category-badge">
                      {expense.category}
                    </div>
                    <div className="expense-amount-simple">
                      <span className="expense-currency">
                        {expense.currency || "CAD"}
                      </span>
                      <span className="expense-value">
                        {formatCurrency(
                          convertedExpenseAmounts[expense.id] || expense.amount,
                          selectedCurrency
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => onDeleteExpense(expense.id)}
                      className="delete-btn-simple"
                    >
                      ×
                    </button>
                  </div>
                  {expense.description && (
                    <div className="expense-description-simple">
                      {expense.description}
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        )}
        {(() => {
          const filteredExpenses = expenses.filter(
            (expense) =>
              expense.description
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              expense.category.toLowerCase().includes(searchTerm.toLowerCase())
          );
          return (
            !isExpensesExpanded &&
            filteredExpenses.length > 3 && (
              <div className="show-more-expenses">
                <p>And {filteredExpenses.length - 3} more expenses...</p>
              </div>
            )
          );
        })()}
      </div>

      {/* Delete Category Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={cancelDeleteCategory}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Category</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete the{" "}
                <span className="category-name">"{categoryToDelete}"</span>{" "}
                category?
              </p>
              <p className="modal-warning">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn modal-btn-cancel"
                onClick={cancelDeleteCategory}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-delete"
                onClick={confirmDeleteCategory}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseForm;
