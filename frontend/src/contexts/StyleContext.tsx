import React, { createContext, useState, useEffect, useCallback, useMemo } from "react";

export type AppStyle = "business" | "casual";

interface StyleContextType {
  style: AppStyle;
  setStyle: (style: AppStyle) => void;
  toggleStyle: () => void;
}

const STORAGE_KEY = "style";
const DEFAULT_STYLE: AppStyle = "business";

const getInitialStyle = (): AppStyle => {
  if (typeof localStorage === "undefined") return DEFAULT_STYLE;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "casual" || saved === "business" ? saved : DEFAULT_STYLE;
};

// Create context (non-component export – suppress react-refresh rule for this line)
// eslint-disable-next-line react-refresh/only-export-components
export const StyleContext = createContext<StyleContextType | undefined>(undefined);

// Style provider component. Mirrors the data-theme handling in ThemeToggle:
// reflects the chosen style onto document.documentElement (data-style) and
// persists it to localStorage. Default is "business"; style does not follow
// any system preference.
export const StyleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [style, setStyleState] = useState<AppStyle>(getInitialStyle);

  useEffect(() => {
    document.documentElement.setAttribute("data-style", style);
    localStorage.setItem(STORAGE_KEY, style);
  }, [style]);

  const setStyle = useCallback((next: AppStyle) => setStyleState(next), []);

  const toggleStyle = useCallback(
    () => setStyleState((prev) => (prev === "business" ? "casual" : "business")),
    []
  );

  const value = useMemo<StyleContextType>(
    () => ({ style, setStyle, toggleStyle }),
    [style, setStyle, toggleStyle]
  );

  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>;
};
