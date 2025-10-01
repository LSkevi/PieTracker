export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  currency: string;
  created_at: string;
}

export interface MonthlySummary {
  month: string;
  total: number;
  expense_count: number;
  categories: { [key: string]: number };
}

export interface ExpenseFormData {
  amount: string;
  category: string;
  description: string;
  currency: string;
}

export interface PieDataItem {
  name: string;
  value: number;
}

export interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: PieDataItem;
    name: string;
    value: number;
    percentage: string;
  }>;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}
