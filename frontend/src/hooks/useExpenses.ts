import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { format } from "date-fns";
import type { Expense, MonthlySummary } from "../types";

const API_BASE = "http://localhost:8000";

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const fetchMonthlySummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE}/expenses/summary/${selectedYear}/${selectedMonth}`
      );
      setSummary(response.data);
    } catch (error) {
      console.error("Error fetching summary:", error);
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
    date?: string
  ) => {
    try {
      await axios.post(`${API_BASE}/expenses`, {
        amount,
        category,
        description,
        date: date || format(new Date(), "yyyy-MM-dd"),
      });
      fetchMonthlySummary();
      fetchMonthlyExpenses();
    } catch (error) {
      console.error("Error adding expense:", error);
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

  const setMonthYear = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchMonthlySummary();
    fetchMonthlyExpenses();
  }, [fetchMonthlySummary, fetchMonthlyExpenses]);

  return {
    expenses,
    summary,
    categories,
    selectedMonth,
    selectedYear,
    loading,
    addExpense,
    deleteExpense,
    setMonthYear,
  };
};
