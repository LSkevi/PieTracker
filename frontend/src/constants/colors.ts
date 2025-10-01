// Shared color constants and utility functions for consistent theming

export const ELEGANT_COLORS = [
  "#7ba098", // 0 - Shopping
  "#a8b5a0", // 1 - Food & Dining
  "#d4b5a0", // 2 - Beauty & Personal Care
  "#d4af9a", // 3 - Fashion & Accessories (warmer rose-tan)
  "#9fb3a3", // 4 - Home & Living
  "#8db3a0", // 5 - Transportation (deeper sage-teal)
  "#d1c4b0", // 6 - Health & Wellness
  "#c8b4a6", // 7 - Entertainment (warm taupe instead of gray)
  "#b3a895", // 8 - Education (soft brown instead of blue-gray)
  "#8fb3a3", // 9 - Gifts
];

export const DARK_MODE_COLORS = [
  "#5c7a73", // 0 - Shopping
  "#7a8c6f", // 1 - Food & Dining
  "#a08970", // 2 - Beauty & Personal Care
  "#b8956f", // 3 - Fashion & Accessories (warmer dark rose-tan)
  "#7a9380", // 4 - Home & Living
  "#6b9688", // 5 - Transportation (deeper dark sage-teal)
  "#a89e87", // 6 - Health & Wellness
  "#9d8b73", // 7 - Entertainment (dark warm taupe instead of gray)
  "#8b7d6b", // 8 - Education (dark soft brown instead of blue-gray)
  "#6b8a7a", // 9 - Gifts
];

// Category order matching backend
export const CATEGORY_ORDER = [
  "Shopping",
  "Food & Dining",
  "Beauty & Personal Care",
  "Fashion & Accessories",
  "Home & Living",
  "Transportation",
  "Health & Wellness",
  "Entertainment",
  "Education",
  "Gifts",
  "Coffee & Treats",
  "Self Care",
  "Fitness",
  "Subscriptions",
  "Other",
];

export const getCategoryColor = (
  categoryName: string,
  isDarkMode: boolean
): string => {
  const colors = isDarkMode ? DARK_MODE_COLORS : ELEGANT_COLORS;
  const index = CATEGORY_ORDER.indexOf(categoryName);
  if (index === -1) {
    // If category not found, use last color (Other)
    return colors[colors.length - 1];
  }
  return colors[index % colors.length];
};

// Utility function to check if dark mode is enabled
export const isDarkModeEnabled = (): boolean => {
  return document.documentElement.getAttribute("data-theme") === "dark";
};
