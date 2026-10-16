import { z } from "zod";
import { isDayKey } from "../../lib/dates.js";

const DayKey = z.string().refine(isDayKey, "Use a real date written as YYYY-MM-DD");

export const BakeriesQuery = z.object({
  // A delivery area such as "Ntinda". Leave it out to list every bakery.
  area: z.string().trim().min(1).max(80).optional(),
  country: z
    .string()
    .length(2)
    .transform((c) => c.toUpperCase())
    .optional(),
  q: z.string().trim().min(1).max(80).optional(),
});

export const AvailabilityQuery = z.object({
  from: DayKey.optional(),
  days: z.coerce.number().int().min(1).max(92).default(42),
});

// Currency, country and timezone are set when a bakery joins and aren't edited here.
export const BakerySettingsUpdate = z
  .object({
    name: z.string().trim().min(1).max(120),
    about: z.string().trim().max(300).nullable(),
    phone: z.string().trim().max(30).nullable(),
    address: z.string().trim().max(200).nullable(),
    city: z.string().trim().min(1).max(80),
    imageUrl: z.string().url().nullable(),
    deliveryAreas: z.array(z.string().trim().min(1).max(80)).max(50),
    deliveryFee: z.number().int().nonnegative(),
    pickupAvailable: z.boolean(),
    acceptsCash: z.boolean(),
    acceptsMobileMoney: z.boolean(),
    mobileMoneyNumber: z.string().trim().max(30).nullable(),
    customCakesPerDay: z.number().int().min(0).max(100),
    customNoticeDays: z.number().int().min(0).max(60),
    closedWeekdays: z.array(z.number().int().min(1).max(7)).max(7),
  })
  .partial();
export type BakerySettingsUpdate = z.infer<typeof BakerySettingsUpdate>;

export const MemberInput = z.object({
  email: z.string().trim().email(),
  role: z.enum(["OWNER", "STAFF"]).default("STAFF"),
});

export const BlockedDateInput = z.object({
  date: DayKey,
  reason: z.string().trim().max(200).optional(),
});
