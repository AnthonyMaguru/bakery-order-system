import { dateFromKey } from "../../lib/dates.js";
import { badRequest, conflict, HttpError, notFound } from "../../lib/http-error.js";
import { prisma, Prisma, type Bakery } from "../../lib/prisma.js";
import { nextCustomDate, todayFor } from "./availability.service.js";
import type { BakerySettingsUpdate } from "./bakeries.schemas.js";

// What anyone may see about a bakery. Capacity rules and staff stay private.
const publicFields = {
  id: true,
  slug: true,
  name: true,
  about: true,
  phone: true,
  address: true,
  city: true,
  country: true,
  currency: true,
  imageUrl: true,
  deliveryAreas: true,
  deliveryFee: true,
  pickupAvailable: true,
  acceptsCash: true,
  acceptsMobileMoney: true,
  mobileMoneyNumber: true,
} as const;

export const sameText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" }) === 0;

async function cakePricesFrom(bakeryIds: string[]) {
  const rows = await prisma.product.groupBy({
    by: ["bakeryId"],
    where: { bakeryId: { in: bakeryIds }, isActive: true, category: "CAKE" },
    _min: { price: true },
  });
  return new Map(rows.map((r) => [r.bakeryId, r._min.price]));
}

function toPublic(bakery: Bakery, priceFrom: number | null | undefined, next: string | null) {
  const visible = Object.fromEntries(Object.keys(publicFields).map((k) => [k, bakery[k as keyof Bakery]]));
  return { ...visible, cakesFrom: priceFrom ?? null, nextCustomDate: next };
}

// Sorted by the soonest day a custom cake could be ready, then by name.
export async function listBakeries(filters: { area?: string; country?: string; q?: string }) {
  const bakeries = await prisma.bakery.findMany({
    where: {
      isActive: true,
      country: filters.country,
      name: filters.q ? { contains: filters.q, mode: "insensitive" } : undefined,
    },
    orderBy: { name: "asc" },
  });
  const inArea = filters.area
    ? bakeries.filter((b) => b.deliveryAreas.some((a) => sameText(a, filters.area!)) || sameText(b.city, filters.area!))
    : bakeries;

  const [prices, nextDates] = await Promise.all([
    cakePricesFrom(inArea.map((b) => b.id)),
    Promise.all(inArea.map((b) => nextCustomDate(b))),
  ]);
  return inArea
    .map((b, i) => toPublic(b, prices.get(b.id), nextDates[i]))
    .sort((a, b) => (a.nextCustomDate ?? "9999").localeCompare(b.nextCustomDate ?? "9999"));
}

// Accepts the bakery's id or its slug.
export async function findActiveBakery(idOrSlug: string) {
  const bakery = await prisma.bakery.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], isActive: true } });
  if (!bakery) throw notFound("Bakery");
  return bakery;
}

export async function getPublicBakery(idOrSlug: string) {
  const bakery = await findActiveBakery(idOrSlug);
  const [prices, next] = await Promise.all([cakePricesFrom([bakery.id]), nextCustomDate(bakery)]);
  return toPublic(bakery, prices.get(bakery.id), next);
}

export async function getStaffBakery(bakeryId: string) {
  const bakery = await prisma.bakery.findUnique({ where: { id: bakeryId } });
  if (!bakery) throw notFound("Bakery");
  return bakery;
}

export async function updateSettings(bakeryId: string, data: BakerySettingsUpdate) {
  const current = await getStaffBakery(bakeryId);
  const next = { ...current, ...data };
  if (!next.acceptsCash && !next.acceptsMobileMoney) throw badRequest("Accept at least one way to pay");
  if (!next.pickupAvailable && next.deliveryAreas.length === 0) {
    throw badRequest("Offer pickup or at least one delivery area, or customers can't receive their cakes");
  }
  if (data.closedWeekdays) data.closedWeekdays = [...new Set(data.closedWeekdays)].sort();
  if (data.deliveryAreas) {
    data.deliveryAreas = data.deliveryAreas.filter((a, i, all) => all.findIndex((b) => sameText(a, b)) === i);
  }
  return prisma.bakery.update({ where: { id: bakeryId }, data });
}

// ---------------------------------------------------------------------------
// Staff members
// ---------------------------------------------------------------------------

const memberSelect = {
  id: true,
  role: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

export function listMembers(bakeryId: string) {
  return prisma.bakeryMember.findMany({ where: { bakeryId }, select: memberSelect, orderBy: { createdAt: "asc" } });
}

export async function addMember(bakeryId: string, email: string, role: "OWNER" | "STAFF") {
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user) throw new HttpError(404, "No account uses that email. Ask them to sign in to the app once, then try again");
  try {
    return await prisma.bakeryMember.create({ data: { bakeryId, userId: user.id, role }, select: memberSelect });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw conflict("That person is already on your staff");
    }
    throw err;
  }
}

export async function removeMember(bakeryId: string, memberId: string) {
  const member = await prisma.bakeryMember.findFirst({ where: { id: memberId, bakeryId } });
  if (!member) throw notFound("Staff member");
  if (member.role === "OWNER") {
    const owners = await prisma.bakeryMember.count({ where: { bakeryId, role: "OWNER" } });
    if (owners <= 1) throw conflict("A bakery needs at least one owner. Make someone else an owner first");
  }
  await prisma.bakeryMember.delete({ where: { id: member.id } });
}

// ---------------------------------------------------------------------------
// Blocked dates
// ---------------------------------------------------------------------------

export async function listBlockedDates(bakeryId: string) {
  const bakery = await getStaffBakery(bakeryId);
  return prisma.blockedDate.findMany({
    where: { bakeryId, date: { gte: dateFromKey(todayFor(bakery)) } },
    orderBy: { date: "asc" },
  });
}

export async function blockDate(bakeryId: string, date: string, reason?: string) {
  try {
    return await prisma.blockedDate.create({ data: { bakeryId, date: dateFromKey(date), reason } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw conflict("That date is already blocked");
    }
    throw err;
  }
}

export async function unblockDate(bakeryId: string, blockedDateId: string) {
  const row = await prisma.blockedDate.findFirst({ where: { id: blockedDateId, bakeryId } });
  if (!row) throw notFound("Blocked date");
  await prisma.blockedDate.delete({ where: { id: row.id } });
}
