import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "./ThemeToggle";

// jsdom does not implement window.matchMedia, which ThemeToggle calls on mount.
// Stub it to report "light" preference so the default state is deterministic.
function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    stubMatchMedia(false); // prefers-color-scheme: dark -> false
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders in light mode by default when no preference is stored", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    // Light mode shows the moon icon and offers to switch TO dark.
    expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("switches to dark mode on click and persists the choice", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    await user.click(button);

    expect(button).toHaveAttribute("aria-label", "Switch to light mode");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("toggles back to light mode on a second click", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    await user.click(button); // -> dark
    await user.click(button); // -> light

    expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("initializes to dark mode when the stored theme is dark", () => {
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);
    const button = screen.getByRole("button");

    expect(button).toHaveAttribute("aria-label", "Switch to light mode");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
