import { afterEach, describe, expect, it, vi } from "vitest";
import { parseDateStringAsLocal } from "./date";

describe("parseDateStringAsLocal", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses a YYYY-MM-DD string into the matching local calendar day", () => {
    const d = parseDateStringAsLocal("2024-03-15");
    // The whole point of the helper: no UTC day-shift. The local Y/M/D must
    // equal the input regardless of the machine's timezone.
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2); // March, 0-indexed
    expect(d.getDate()).toBe(15);
  });

  it("does not shift the day at a month boundary", () => {
    // A naive new Date('2024-01-01') is UTC midnight, which in any negative
    // (e.g. Americas) offset renders as Dec 31 of the previous year locally.
    const d = parseDateStringAsLocal("2024-01-01");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it("accepts the YYYY/MM/DD separator variant", () => {
    const d = parseDateStringAsLocal("2023/12/25");
    expect(d.getFullYear()).toBe(2023);
    expect(d.getMonth()).toBe(11); // December
    expect(d.getDate()).toBe(25);
  });

  it("falls back to the current date for undefined input", () => {
    vi.useFakeTimers();
    const now = new Date(2026, 5, 22, 10, 30, 0); // 2026-06-22 local
    vi.setSystemTime(now);

    const d = parseDateStringAsLocal(undefined);
    expect(d.getTime()).toBe(now.getTime());
  });

  it("falls back to the current date for an unparseable string", () => {
    vi.useFakeTimers();
    const now = new Date(2026, 5, 22, 10, 30, 0);
    vi.setSystemTime(now);

    const d = parseDateStringAsLocal("not-a-date");
    expect(d.getTime()).toBe(now.getTime());
  });
});
