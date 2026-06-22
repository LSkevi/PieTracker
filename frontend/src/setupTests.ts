// Vitest setup: registers jest-dom matchers (e.g. toBeInTheDocument,
// toHaveAttribute) and clears the jsdom localStorage between tests so
// each test starts from a clean, deterministic state.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(() => {
  localStorage.clear();
});
