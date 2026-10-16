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
