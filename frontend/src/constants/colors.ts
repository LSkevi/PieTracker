// Shared color constants and utility functions for consistent theming

export const ELEGANT_COLORS = [
  "#525B02", // 0 - Transportation (Deep forest green)
  "#9B9E56", // 1 - Food (Fresh sage green)
  "#A2B7B0", // 2 - Entertainment (Soft mint)
  "#BCA3A4", // 3 - Shopping (Dusty rose)
  "#695216", // 4 - Additional categories (Warm earth brown)
  "#2d4a22", // 5 - Deep olive
  "#b8860b", // 6 - Dark goldenrod
  "#8fbc8f", // 7 - Dark sea green
  "#daa520", // 8 - Goldenrod
  "#5f9ea0", // 9 - Cadet blue
];

export const DARK_MODE_COLORS = [
  "#6b7d03", // 0 - Transportation (Brighter forest)
  "#b5b869", // 1 - Food (Brighter sage)
  "#b5c9c1", // 2 - Entertainment (Brighter mint)
  "#d0b5b6", // 3 - Shopping (Brighter dusty rose)
  "#7a601c", // 4 - Additional categories (Brighter earth)
  "#3e5e32", // 5 - Brighter olive
  "#daa520", // 6 - Bright goldenrod
  "#98c098", // 7 - Brighter sea green
  "#ffd700", // 8 - Gold
  "#70a3a6", // 9 - Brighter cadet blue
];

// Business style: sober indigo/slate categorical palette (fintech), distinguishable hues
export const BUSINESS_COLORS = [
  "#4338ca", // 0 - Transportation (indigo)
  "#0891b2", // 1 - Food (cyan)
  "#7c3aed", // 2 - Entertainment (violet)
  "#b45309", // 3 - Shopping (amber)
  "#0f766e", // 4 - teal
  "#be123c", // 5 - rose
  "#4d7c0f", // 6 - lime
  "#1d4ed8", // 7 - blue
  "#a21caf", // 8 - fuchsia
  "#475569", // 9 - slate
];

export const BUSINESS_DARK_COLORS = [
  "#818cf8", // 0 - Transportation (indigo)
  "#22d3ee", // 1 - Food (cyan)
  "#a78bfa", // 2 - Entertainment (violet)
  "#fbbf24", // 3 - Shopping (amber)
  "#2dd4bf", // 4 - teal
  "#fb7185", // 5 - rose
  "#a3e635", // 6 - lime
  "#60a5fa", // 7 - blue
  "#e879f9", // 8 - fuchsia
  "#94a3b8", // 9 - slate
];

// Category order matching our system (simplified for main categories)
export const CATEGORY_ORDER = [
  "Food",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Other",
];

export const getCategoryColor = (
  categoryName: string,
  isDarkMode: boolean,
  customColors?: { [key: string]: string },
  styleOverride?: "business" | "casual"
): string => {
  // Check for custom colors first (only if customColors is not empty)
  if (
    customColors &&
    Object.keys(customColors).length > 0 &&
    customColors[categoryName]
  ) {
    return customColors[categoryName];
  }

  const isBusiness = (styleOverride ?? getAppStyle()) === "business";
  const colors = isBusiness
    ? isDarkMode
      ? BUSINESS_DARK_COLORS
      : BUSINESS_COLORS
    : isDarkMode
    ? DARK_MODE_COLORS
    : ELEGANT_COLORS;

  // Direct mapping for our main categories (case-insensitive)
  const categoryColorMap: { [key: string]: number } = {
    food: 1, // Fresh sage green
    transportation: 0, // Deep forest green
    shopping: 3, // Dusty rose
    entertainment: 2, // Soft mint
  };

  const normalizedCategory = categoryName.toLowerCase();
  if (categoryColorMap[normalizedCategory] !== undefined) {
    return colors[categoryColorMap[normalizedCategory]];
  }

  // For custom categories, use a hash to consistently assign colors
  const hash = categoryName.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const colorIndex = 4 + (hash % (colors.length - 4)); // Start from index 4 for custom categories
  return colors[colorIndex];
};

// Utility function to check if dark mode is enabled
export const isDarkModeEnabled = (): boolean => {
  // Add null check for document
  if (typeof document === "undefined" || !document.documentElement) {
    return false;
  }

  const theme = document.documentElement.getAttribute("data-theme");
  return theme === "dark";
};

// Utility function to read the active visual style (business default)
export const getAppStyle = (): "business" | "casual" => {
  if (typeof document === "undefined" || !document.documentElement) {
    return "business";
  }
  return document.documentElement.getAttribute("data-style") === "casual"
    ? "casual"
    : "business";
};
