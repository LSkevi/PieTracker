import React from "react";
import { useStyle } from "../hooks/useStyle";

// Briefcase (Lucide) – shown while casual is active, action = switch to business.
const BriefcaseIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

// Leaf (Lucide) – shown while business is active, action = switch to casual.
// Here the leaf is a monochrome control glyph, not decoration.
const LeafIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

const StyleToggle: React.FC = () => {
  const { style, toggleStyle } = useStyle();
  const isBusiness = style === "business";

  return (
    <button
      className="style-toggle"
      onClick={toggleStyle}
      aria-label={isBusiness ? "Switch to casual style" : "Switch to business style"}
      title={isBusiness ? "Switch to casual style" : "Switch to business style"}
    >
      {isBusiness ? <LeafIcon /> : <BriefcaseIcon />}
    </button>
  );
};

export default StyleToggle;
