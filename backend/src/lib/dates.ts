// Calendar days are "YYYY-MM-DD" strings in the bakery's own timezone, so an order
// due at 11 pm in Kampala lands on the right day even though it is stored in UTC.

const formatters = new Map<string, Intl.DateTimeFormat>();

export function dayKey(date: Date, timeZone: string): string {
  let format = formatters.get(timeZone);
  if (!format) {
    // en-CA formats dates as YYYY-MM-DD.
    format = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    formatters.set(timeZone, format);
  }
  return format.format(date);
}

const toUtc = (key: string) => new Date(`${key}T00:00:00Z`);

// 1 is Monday, 7 is Sunday.
export function isoWeekday(key: string): number {
  const day = toUtc(key).getUTCDay();
  return day === 0 ? 7 : day;
}

export function addDays(key: string, days: number): string {
  const date = toUtc(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// True for real calendar days only, so "2026-02-30" is rejected.
export function isDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = toUtc(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// The stored value for a @db.Date column.
export const dateFromKey = toUtc;
