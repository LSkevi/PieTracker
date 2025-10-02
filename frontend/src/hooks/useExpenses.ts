import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { format } from "date-fns";
import type { Expense, MonthlySummary, Currency } from "../types";
import { getDefaultCurrency } from "../utils/currency";

// Use environment variable or fallback to your backend for production
const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? "https://pietracker.onrender.com" : "http://localhost:8000");

// Debug logging
console.log('Environment:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  PROD: import.meta.env.PROD,
  API_BASE
});

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<{
    [key: string]: string;
  }>({});
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    getDefaultCurrency()
  );
  const [availableMonths, setAvailableMonths] = useState<
    { year: number; month: number; year_month: string }[]
  >([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Set default categories if API fails
      setCategories([
        "Food", "Transportation", "Shopping", "Entertainment", 
        "Health", "Bills", "Travel", "Education", "Other"
      ]);
    }
  }, []);

  const fetchCategoryColors = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/categories/colors`);
      setCategoryColors(response.data);
    } catch (error) {
      console.error("Error fetching category colors:", error);
      // Set empty colors object if API fails
      setCategoryColors({});
    }
  }, []);

  const fetchCurrencies = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/currencies`);
      setCurrencies(response.data);
    } catch (error) {
      console.error("Error fetching currencies:", error);
      // Set default currencies if API fails
      setCurrencies([
        { code: "USD", name: "US Dollar", symbol: "$" },
        { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
        { code: "EUR", name: "Euro", symbol: "€" },
        { code: "GBP", name: "British Pound", symbol: "£" },
        { code: "JPY", name: "Japanese Yen", symbol: "¥" }
      ]);
    }
  }, []);

  const fetchAvailableMonths = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/expenses/available-months`);
      setAvailableMonths(response.data);
    } catch (error) {
      console.error("Error fetching available months:", error);
      // Set current month as default if API fails
      const currentDate = new Date();
      setAvailableMonths([{
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        year_month: `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`
      }]);
    }
  }, []);

  const fetchMonthlySummary = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching from:", `${API_BASE}/expenses/summary/${selectedYear}/${selectedMonth}`);
      const response = await axios.get(
        `${API_BASE}/expenses/summary/${selectedYear}/${selectedMonth}`
      );
      setSummary(response.data);
    } catch (error) {
      console.error("Error fetching summary:", error);
      // Set a default empty summary if API fails
      setSummary({
        total: 0,
        categories: {},
        month: selectedMonth.toString(),
        expense_count: 0
      });
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  const fetchMonthlyExpenses = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/expenses/month/${selectedYear}/${selectedMonth}`
      );
      setExpenses(response.data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  }, [selectedYear, selectedMonth]);

  const addExpense = async (
    amount: number,
    category: string,
    description: string,
    currency: string,
    date?: string
  ) => {
    try {
      await axios.post(`${API_BASE}/expenses`, {
        amount,
        category,
        description,
        currency,
        date: date || format(new Date(), "yyyy-MM-dd"),
      });
      fetchCategories(); // Refresh categories in case new category was used
      fetchMonthlySummary();
      fetchMonthlyExpenses();
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  const addCategory = async (
    categoryName: string,
    categoryColor: string = "#a8b5a0"
  ) => {
    try {
      await axios.post(`${API_BASE}/categories`, {
        name: categoryName,
        color: categoryColor,
      });

      // Refresh categories and colors
      await fetchCategories();
      await fetchCategoryColors();
      return true;
    } catch (error) {
      console.error("Error adding category:", error);
      return false;
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      await axios.delete(`${API_BASE}/expenses/${expenseId}`);
      fetchMonthlySummary();
      fetchMonthlyExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const deleteCategory = async (categoryName: string) => {
    try {
      await axios.delete(`${API_BASE}/categories/${categoryName}`);
      fetchCategories(); // Refresh categories list
      fetchCategoryColors(); // Refresh category colors
      fetchMonthlySummary(); // Refresh summary
      fetchMonthlyExpenses(); // Refresh expenses
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error; // Re-throw so the component can handle it
    }
  };

  const setMonthYear = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  useEffect(() => {
    fetchCategories();
    fetchCategoryColors();
    fetchCurrencies();
    fetchAvailableMonths();
  }, [
    fetchCategories,
    fetchCategoryColors,
    fetchCurrencies,
    fetchAvailableMonths,
  ]);

  useEffect(() => {
    fetchMonthlySummary();
    fetchMonthlyExpenses();
    // Refresh available months when expenses change
    fetchAvailableMonths();
  }, [fetchMonthlySummary, fetchMonthlyExpenses, fetchAvailableMonths]);

  return {
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
  };
};
