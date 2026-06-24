// Shared color constants and utility functions for consistent theming

// Casual (printshop) categorical palette: earthy spruce/olive with saffron + brick
// accents and an indigo ink anchor. Harmonious, not rainbow.
export const ELEGANT_COLORS = [
  "#3e6b5a", // 0 - Transportation (spruce)
  "#6e8c4e", // 1 - Food (olive)
  "#4f8a86", // 2 - Entertainment (teal-green)
  "#c98a1e", // 3 - Shopping (saffron)
  "#a8412e", // 4 - brick
  "#2a2e45", // 5 - indigo ink
  "#8a6d3b", // 6 - bronze
  "#5c8a74", // 7 - spruce light
  "#b5793a", // 8 - ochre
  "#6b6f5a", // 9 - olive grey
];

export const DARK_MODE_COLORS = [
  "#5c8a74", // 0 - Transportation (spruce dim)
  "#9aad6a", // 1 - Food (olive)
  "#6fb0a8", // 2 - Entertainment (teal)
  "#d49a36", // 3 - Shopping (saffron)
  "#d4796a", // 4 - brick
  "#9a8fbf", // 5 - indigo
  "#b89a5a", // 6 - bronze
  "#7faa8e", // 7 - spruce light
  "#d4a05a", // 8 - ochre
  "#9a9d82", // 9 - olive grey
];

// Business (precision-instrument) categorical palette: petrol-led, muted and
// cohesive with restrained warm accents. Distinguishable but not rainbow.
export const BUSINESS_COLORS = [
  "#0e6e73", // 0 - Transportation (petrol, brand)
  "#3b6ea5", // 1 - Food (muted blue)
  "#8a5a83", // 2 - Entertainment (muted plum)
  "#c98a1e", // 3 - Shopping (saffron)
  "#4f7a6a", // 4 - sage-teal
  "#a8533f", // 5 - terracotta
  "#5b6b8c", // 6 - slate-blue
  "#2f8f86", // 7 - teal
  "#7a6f9c", // 8 - lavender
  "#6b7b80", // 9 - cool grey
];

export const BUSINESS_DARK_COLORS = [
  "#2fa8ae", // 0 - Transportation (petrol bright)
  "#6a9fd8", // 1 - Food (blue)
  "#c98ac0", // 2 - Entertainment (plum)
  "#e0b15a", // 3 - Shopping (amber)
  "#6fb09a", // 4 - sage-teal
  "#e0917a", // 5 - terracotta
  "#8fa0c8", // 6 - slate-blue
  "#56c2b8", // 7 - teal
  "#b0a3d8", // 8 - lavender
  "#9aa8ad", // 9 - cool grey
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
