/**
 * Frontend configuration constants
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD
      ? "https://pietracker.onrender.com"
      : "http://localhost:8000"),
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
} as const;

// Authentication
export const AUTH_CONFIG = {
  TOKEN_STORAGE_KEY: "pietracker_token",
  USER_STORAGE_KEY: "pietracker_user",
  PUBLIC_USER_ID: "public-anon-user",
} as const;

// UI Configuration
export const UI_CONFIG = {
  EXPENSE_PAGINATION_SIZE: 50,
  CHART_COLORS: [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#AED6F1",
  ],
  DEBOUNCE_DELAY: 300,
} as const;

// Default Categories
export const DEFAULT_CATEGORIES = {
  Food: "#FF6B6B",
  Transportation: "#4ECDC4",
  Shopping: "#45B7D1",
  Entertainment: "#96CEB4",
} as const;

// Supported Currencies
export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CHF", name: "Swiss Franc", symbol: "₣" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
] as const;

// App metadata
export const APP_CONFIG = {
  NAME: "PieTracker",
  VERSION: "2.7.0",
  DESCRIPTION: "Elegant Finance App",
} as const;
