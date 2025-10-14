// Parse a YYYY-MM-DD (or YYYY/MM/DD) string as a local Date object.
// Using the Date("YYYY-MM-DD") constructor creates a UTC date which can
// shift the calendar day when formatted in local timezones. This helper
// constructs a Date using local year/month/day to avoid that.
export function parseDateStringAsLocal(s?: string): Date {
  if (!s) return new Date();
  try {
    const parts = s.split(/[-/]/).map((p) => p.trim());
    if (parts.length === 3 && parts[0].length === 4) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
  } catch {
    // fall through to fallback
  }
  const fallback = new Date(s as string);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}
