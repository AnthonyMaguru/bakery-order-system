import { notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import type { BakeryApplicationInput } from "./bakery-applications.schemas.js";

export function createApplication(data: BakeryApplicationInput) {
  return prisma.bakeryApplication.create({
    data: {
      ...data,
      email: data.email.toLowerCase(),
      notes: data.notes || null,
    },
    select: { id: true, status: true, createdAt: true },
  });
}

export function listApplications() {
  return prisma.bakeryApplication.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function updateApplicationStatus(
  id: string,
  status: "PENDING" | "CONTACTED" | "APPROVED" | "DECLINED",
) {
  const application = await prisma.bakeryApplication.findUnique({ where: { id }, select: { id: true } });
  if (!application) throw notFound("Bakery application");
  return prisma.bakeryApplication.update({ where: { id }, data: { status } });
}

function baseSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "bakery";
}

export async function onboardApplication(id: string) {
  const application = await prisma.bakeryApplication.findUnique({ where: { id } });
  if (!application) throw notFound("Bakery application");
  if (application.bakeryId) {
    return prisma.bakery.findUniqueOrThrow({ where: { id: application.bakeryId } });
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.bakeryApplication.findUnique({ where: { id } });
    if (!existing) throw notFound("Bakery application");
    if (existing.bakeryId) return tx.bakery.findUniqueOrThrow({ where: { id: existing.bakeryId } });

    const slugRoot = baseSlug(existing.bakeryName);
    let slug = slugRoot;
    for (let suffix = 2; await tx.bakery.findUnique({ where: { slug }, select: { id: true } }); suffix += 1) {
      slug = `${slugRoot}-${suffix}`;
    }
    const bakery = await tx.bakery.create({
      data: {
        slug,
        name: existing.bakeryName,
        city: existing.city,
        phone: existing.phone,
      },
    });
    const owner = await tx.user.findFirst({ where: { email: { equals: existing.email, mode: "insensitive" } }, select: { id: true } });
    if (owner) {
      await tx.bakeryMember.create({ data: { bakeryId: bakery.id, userId: owner.id, role: "OWNER" } });
    }
    await tx.bakeryApplication.update({
      where: { id },
      data: { bakeryId: bakery.id, status: "APPROVED" },
    });
    return bakery;
  });
}
