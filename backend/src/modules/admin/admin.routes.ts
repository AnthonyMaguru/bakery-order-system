import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../lib/access.js";
import { badRequest, notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

export const adminRouter = Router();

// All admin routes require a verified user with the platform ADMIN role.
adminRouter.use(requireAuth, requireRole("ADMIN"));

/**
 * Platform overview metrics: high-level marketplace statistics.
 * Does not expose any individual bakery's private recipes, stock items, or order details.
 */
adminRouter.get("/overview", async (_req, res) => {
  const [totalBakeries, activeBakeries, pendingApplications, totalUsers, totalOrders] = await Promise.all([
    prisma.bakery.count(),
    prisma.bakery.count({ where: { isActive: true } }),
    prisma.bakeryApplication.count({ where: { status: "PENDING" } }),
    prisma.user.count(),
    prisma.order.count(),
  ]);

  res.json({
    totalBakeries,
    activeBakeries,
    suspendedBakeries: totalBakeries - activeBakeries,
    pendingApplications,
    totalUsers,
    totalOrders,
  });
});

/**
 * Platform bakery directory: high-level list of bakeries registered on the platform.
 * Allows the platform admin to view status and active member/product/order counts.
 */
adminRouter.get("/bakeries", async (_req, res) => {
  const bakeries = await prisma.bakery.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      phone: true,
      address: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          members: true,
          products: true,
          orders: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(bakeries);
});

const BakeryStatusInput = z.object({
  isActive: z.boolean(),
});

/**
 * Suspend or reactivate a bakery on the platform.
 * Suspended bakeries are immediately hidden from customer ordering on mobile.
 */
adminRouter.patch("/bakeries/:bakeryId/status", async (req, res) => {
  const { isActive } = BakeryStatusInput.parse(req.body);
  const exists = await prisma.bakery.findUnique({ where: { id: req.params.bakeryId }, select: { id: true } });
  if (!exists) throw notFound("Bakery");

  const updated = await prisma.bakery.update({
    where: { id: req.params.bakeryId },
    data: { isActive },
    select: { id: true, name: true, slug: true, isActive: true },
  });

  res.json(updated);
});

/**
 * Platform user directory: list registered users, their roles, and account dates.
 */
adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          memberships: true,
          orders: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(users);
});

const UserRoleInput = z.object({
  role: z.enum(["ADMIN", "CUSTOMER"]),
});

/**
 * Promote or demote a user to/from platform ADMIN.
 * Admins cannot revoke their own admin role to prevent accidental lockout.
 */
adminRouter.patch("/users/:userId/role", async (req, res) => {
  const { role } = UserRoleInput.parse(req.body);

  if (req.user!.id === req.params.userId && role !== "ADMIN") {
    throw badRequest("You cannot remove your own administrator role");
  }

  const exists = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { id: true } });
  if (!exists) throw notFound("User");

  // Admins must remain completely independent from bakeries.
  // If promoting to ADMIN, remove any existing bakery memberships.
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: req.params.userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    }),
    ...(role === "ADMIN" ? [prisma.bakeryMember.deleteMany({ where: { userId: req.params.userId } })] : []),
  ]);

  res.json(updated);
});
