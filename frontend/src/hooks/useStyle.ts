import { useContext } from "react";
import { StyleContext } from "../contexts/StyleContext";

export const useStyle = () => {
  const context = useContext(StyleContext);
  if (context === undefined) {
    throw new Error("useStyle must be used within a StyleProvider");
  }
  return context;
};
