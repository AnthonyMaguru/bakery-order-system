import { addDays, dateFromKey, dayKey } from "../../lib/dates.js";
import { conflict } from "../../lib/http-error.js";
import { prisma, type Bakery, type Prisma } from "../../lib/prisma.js";
import { buildCalendar, DAY_STATUS_MESSAGES, dayStatus, type CapacityRules } from "./availability.js";

type Db = Prisma.TransactionClient | typeof prisma;

// Custom and bulk orders use the bakery's daily slots; ready-made ones don't.
export const CAPACITY_TYPES = ["CUSTOM", "BULK"] as const;

export const customRules = (bakery: Bakery): CapacityRules => ({
  customCakesPerDay: bakery.customCakesPerDay,
  noticeDays: bakery.customNoticeDays,
  closedWeekdays: bakery.closedWeekdays,
});

export const todayFor = (bakery: Bakery) => dayKey(new Date(), bakery.timezone);

async function bookedByDay(db: Db, bakery: Bakery, from: string, to: string) {
  // Widen the UTC window by a day each side; dayKey() then sorts orders into local days.
  const orders = await db.order.findMany({
    where: {
      bakeryId: bakery.id,
      type: { in: [...CAPACITY_TYPES] },
      status: { not: "CANCELLED" },
      dueDate: { gte: dateFromKey(addDays(from, -1)), lt: dateFromKey(addDays(to, 2)) },
    },
    select: { dueDate: true },
  });
  const counts = new Map<string, number>();
  for (const { dueDate } of orders) {
    const key = dayKey(dueDate, bakery.timezone);
    if (key >= from && key <= to) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

async function blockedDays(db: Db, bakery: Bakery, from: string, to: string) {
  const rows = await db.blockedDate.findMany({
    where: { bakeryId: bakery.id, date: { gte: dateFromKey(from), lte: dateFromKey(to) } },
    select: { date: true },
  });
  return new Set(rows.map((r) => r.date.toISOString().slice(0, 10)));
}

export async function getCalendar(bakery: Bakery, from: string, days: number) {
  const to = addDays(from, days - 1);
  const [booked, blocked] = await Promise.all([bookedByDay(prisma, bakery, from, to), blockedDays(prisma, bakery, from, to)]);
  return buildCalendar(from, days, todayFor(bakery), customRules(bakery), booked, blocked);
}

// The first day a new custom order could be due, looking up to 60 days ahead.
export async function nextCustomDate(bakery: Bakery) {
  const today = todayFor(bakery);
  const calendar = await getCalendar(bakery, today, 60);
  return calendar.find((d) => d.status === "OPEN")?.date ?? null;
}

// Throws a 409 explaining why the due date can't be used. Call inside the order's
// transaction: the advisory lock stops two customers taking the last slot at once.
export async function assertDueDateAvailable(
  tx: Prisma.TransactionClient,
  bakery: Bakery,
  dueDate: Date,
  options: { usesCapacity: boolean; leadTimeDays: number },
) {
  const date = dayKey(dueDate, bakery.timezone);
  if (dueDate.getTime() <= Date.now()) throw conflict("The due date has already passed");

  let booked = 0;
  if (options.usesCapacity) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${bakery.id}:${date}`}))::text`;
    booked = (await bookedByDay(tx, bakery, date, date)).get(date) ?? 0;
  }
  const blocked = (await blockedDays(tx, bakery, date, date)).has(date);
  const rules = options.usesCapacity
    ? customRules(bakery)
    : { ...customRules(bakery), noticeDays: options.leadTimeDays };

  const status = dayStatus(date, todayFor(bakery), rules, booked, blocked, options.usesCapacity);
  if (status !== "OPEN") throw conflict(DAY_STATUS_MESSAGES[status]);
}
