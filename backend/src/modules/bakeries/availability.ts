import { addDays, isoWeekday } from "../../lib/dates.js";

// Pure capacity rules, kept apart from the database so they are easy to test.

export type DayStatus = "OPEN" | "FULL" | "CLOSED" | "BLOCKED" | "TOO_SOON";

export interface CapacityRules {
  customCakesPerDay: number;
  // Days of notice needed, counted from today.
  noticeDays: number;
  closedWeekdays: number[];
}

export interface CalendarDay {
  date: string;
  status: DayStatus;
  booked: number;
  limit: number;
}

// `capacity: false` is for ready-made orders, which don't use custom-cake slots.
export function dayStatus(
  date: string,
  today: string,
  rules: CapacityRules,
  booked: number,
  blocked: boolean,
  capacity = true,
): DayStatus {
  if (rules.closedWeekdays.includes(isoWeekday(date))) return "CLOSED";
  if (blocked) return "BLOCKED";
  if (date < addDays(today, rules.noticeDays)) return "TOO_SOON";
  if (capacity && booked >= rules.customCakesPerDay) return "FULL";
  return "OPEN";
}

export function buildCalendar(
  from: string,
  days: number,
  today: string,
  rules: CapacityRules,
  bookedByDay: Map<string, number>,
  blockedDays: Set<string>,
): CalendarDay[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const booked = bookedByDay.get(date) ?? 0;
    return {
      date,
      status: dayStatus(date, today, rules, booked, blockedDays.has(date)),
      booked,
      limit: rules.customCakesPerDay,
    };
  });
}

export const DAY_STATUS_MESSAGES: Record<Exclude<DayStatus, "OPEN">, string> = {
  CLOSED: "The bakery is closed that day",
  BLOCKED: "The bakery isn't taking orders that day",
  TOO_SOON: "That date is too soon for this bakery",
  FULL: "That day is fully booked. Please pick another date",
};
