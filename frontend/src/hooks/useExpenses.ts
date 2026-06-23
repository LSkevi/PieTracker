import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { format } from "date-fns";
import type { Expense, MonthlySummary, Currency } from "../types";
import { getDefaultCurrency } from "../utils/currency";
import { AuthService } from "../services/auth";
import { API_CONFIG } from "../config/constants";

// Headers helper for authenticated API calls (identity comes from the JWT)
function getHeaders() {
  return AuthService.getAuthHeaders();
}

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [yearlyExpenses, setYearlyExpenses] = useState<Expense[]>([]);
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
  const [loadingYearly, setLoadingYearly] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/categories`, {
        headers: getHeaders(),
      });
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Set default categories if API fails
      setCategories([
        "Food",
        "Transportation",
        "Shopping",
        "Entertainment",
        "Health",
        "Bills",
        "Travel",
        "Education",
        "Other",
      ]);
    }
  }, []);

  const fetchCategoryColors = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/categories/colors`,
        {
          headers: getHeaders(),
        }
      );
      setCategoryColors(response.data);
    } catch (error) {
      console.error("Error fetching category colors:", error);
      // Set empty colors object if API fails
      setCategoryColors({});
    }
  }, []);

  const fetchCurrencies = useCallback(async () => {
    try {
      const response = await axios.get(`${API_CONFIG.BASE_URL}/currencies`);
      setCurrencies(response.data);
    } catch (error) {
      console.error("Error fetching currencies:", error);
      // Set default currencies if API fails
      setCurrencies([
        { code: "USD", name: "US Dollar", symbol: "$" },
        { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
        { code: "EUR", name: "Euro", symbol: "€" },
        { code: "GBP", name: "British Pound", symbol: "£" },
        { code: "JPY", name: "Japanese Yen", symbol: "¥" },
      ]);
    }
  }, []);

  const fetchAvailableMonths = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/expenses/available-months`,
        { headers: getHeaders() }
      );
      setAvailableMonths(response.data);
    } catch (error) {
      console.error("Error fetching available months:", error);
      // Set current month as default if API fails
      const currentDate = new Date();
      setAvailableMonths([
        {
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1,
          year_month: `${currentDate.getFullYear()}-${(
            currentDate.getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}`,
        },
      ]);
    }
  }, []);

  const fetchMonthlySummary = useCallback(async () => {
    try {
      setLoading(true);
      const url = `${API_CONFIG.BASE_URL}/expenses/summary/${selectedYear}/${selectedMonth}`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: { "Content-Type": "application/json", ...getHeaders() },
      });

      setSummary(response.data);
    } catch (error) {
      console.error("Error fetching summary:", error);

      // More detailed error logging
      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          code: error.code,
        });
      }

      // Set a default empty summary if API fails
      setSummary({
        total: 0,
        categories: {},
        month: selectedMonth.toString(),
        expense_count: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  const fetchMonthlyExpenses = useCallback(async () => {
    try {
      const url = `${API_CONFIG.BASE_URL}/expenses/month/${selectedYear}/${selectedMonth}`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: { "Content-Type": "application/json", ...getHeaders() },
      });

      setExpenses(response.data);
    } catch (error) {
      console.error("Error fetching expenses:", error);

      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          code: error.code,
        });
      }

      setExpenses([]);
    }
  }, [selectedYear, selectedMonth]);

  const fetchYearlyExpenses = useCallback(async () => {
    try {
      setLoadingYearly(true);
      const url = `${API_CONFIG.BASE_URL}/expenses/year/${selectedYear}`;

      const response = await axios.get(url, {
        timeout: 10000,
        headers: { "Content-Type": "application/json", ...getHeaders() },
      });

      setYearlyExpenses(response.data);
    } catch (error) {
      console.error("Error fetching yearly expenses:", error);

      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          code: error.code,
        });
      }

      setYearlyExpenses([]);
    } finally {
      setLoadingYearly(false);
    }
  }, [selectedYear]);

  const addExpense = async (
    amount: number,
    category: string,
    description: string,
    currency: string,
    date?: string
  ) => {
    try {
      await axios.post(
        `${API_CONFIG.BASE_URL}/expenses`,
        {
          amount,
          category,
          description,
          currency,
          date: date || format(new Date(), "yyyy-MM-dd"),
        },
        { headers: getHeaders() }
      );
      fetchCategories(); // Refresh categories in case new category was used
      fetchMonthlySummary();
      fetchMonthlyExpenses();
      fetchYearlyExpenses();
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  const addCategory = async (
    categoryName: string,
    categoryColor: string = "#a8b5a0"
  ) => {
    try {
      await axios.post(
        `${API_CONFIG.BASE_URL}/categories`,
        { name: categoryName, color: categoryColor },
        { headers: getHeaders() }
      );

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
      await axios.delete(`${API_CONFIG.BASE_URL}/expenses/${expenseId}`, {
        headers: getHeaders(),
      });
      fetchMonthlySummary();
      fetchMonthlyExpenses();
      fetchYearlyExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const deleteCategory = async (categoryName: string) => {
    try {
      await axios.delete(`${API_CONFIG.BASE_URL}/categories/${categoryName}`, {
        headers: getHeaders(),
      });
      fetchCategories(); // Refresh categories list
      fetchCategoryColors(); // Refresh category colors
      fetchMonthlySummary(); // Refresh summary
      fetchMonthlyExpenses(); // Refresh expenses
      fetchYearlyExpenses(); // Refresh yearly expenses
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
    const initializeData = async () => {
      setInitialLoading(true);
      try {
        await Promise.all([
          fetchCategories(),
          fetchCategoryColors(),
          fetchCurrencies(),
          fetchAvailableMonths(),
        ]);
      } finally {
        setInitialLoading(false);
      }
    };
    initializeData();
  }, [
    fetchCategories,
    fetchCategoryColors,
    fetchCurrencies,
    fetchAvailableMonths,
  ]);

  useEffect(() => {
    fetchMonthlySummary();
    fetchMonthlyExpenses();
    fetchYearlyExpenses();
    // Refresh available months when expenses change
    fetchAvailableMonths();
  }, [
    fetchMonthlySummary,
    fetchMonthlyExpenses,
    fetchYearlyExpenses,
    fetchAvailableMonths,
  ]);

  return {
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
  };
};
