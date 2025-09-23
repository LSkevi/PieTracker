import React, { useState } from "react";
import { format } from "date-fns";
import type { ExpenseFormData, Expense } from "../types";

interface ExpenseFormProps {
  categories: string[];
  expenses: Expense[];
  onAddExpense: (
    amount: number,
    category: string,
    description: string,
    date: string
  ) => void;
  onDeleteExpense: (expenseId: string) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  categories,
  expenses,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [formData, setFormData] = useState<ExpenseFormData & { date: string }>({
    amount: "",
    category: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      formData.amount &&
      formData.category &&
      formData.description &&
      formData.date
    ) {
      onAddExpense(
        parseFloat(formData.amount),
        formData.category,
        formData.description,
        formData.date
      );
      setFormData((prev) => ({
        ...prev,
        amount: "",
        category: "",
        description: "",
      }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

  return (
    <div className="card left-panel">
      <h2>Add New Expense</h2>
      <form onSubmit={handleSubmit} className="expense-form">
        <div className="form-group">
          <label>Amount (CAD)</label>
          <input
            type="number"
            name="amount"
            step="0.01"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            required
          />
        </div>

        <div className="form-group">
          <label>Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select a category...</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="What did you spend on?"
            required
          />
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

        <button type="submit" className="btn-primary">
          Add Expense
        </button>
      </form>

      {/* Recent Expenses */}
      <div className="expenses-list">
        <h3 className="recent-expenses-title">Recent Expenses</h3>
        {expenses.length === 0 ? (
          <div className="no-data">No expenses yet this month</div>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="expense-item">
              <div className="expense-details">
                <h4>{expense.description}</h4>
                <p>
                  {expense.category} • {expense.date}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span className="expense-amount">
                  {formatCurrency(expense.amount)}
                </span>
                <button
                  onClick={() => onDeleteExpense(expense.id)}
                  className="delete-btn"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExpenseForm;
