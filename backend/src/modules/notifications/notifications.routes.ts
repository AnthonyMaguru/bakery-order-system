import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

// GET /api/notifications
// Returns the current user's recent notifications and unread count.
notificationsRouter.get("/", async (req, res) => {
  const { limit } = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }).parse(req.query);

  const userId = req.user!.id;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ]);

  res.json({ notifications, unreadCount });
});

// PATCH /api/notifications/read-all
// Marks all unread notifications belonging to the current user as read.
notificationsRouter.patch("/read-all", async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId: req.user!.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  res.json({ updated: result.count });
});

// PATCH /api/notifications/:id/read
// Marks one notification as read, but only if it belongs to the current user.
notificationsRouter.patch("/:id/read", async (req, res) => {
  const { id } = z.object({
    id: z.string().min(1),
  }).parse(req.params);

  const result = await prisma.notification.updateMany({
    where: {
      id,
      userId: req.user!.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  res.json({ updated: result.count });
});
