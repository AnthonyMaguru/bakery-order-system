import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

// Includes the bakeries the user works for; the dashboard opens the first one.
// Platform administrators are independent and never attached to any bakery.
usersRouter.get("/me", async (req, res) => {
  const { id, email, name, phone, role } = req.user!;
  if (role === "ADMIN") {
    return res.json({
      id,
      email,
      name,
      phone,
      role,
      bakeries: [],
    });
  }

  const memberships = await prisma.bakeryMember.findMany({
    where: { userId: id },
    select: { role: true, bakery: { select: { id: true, slug: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json({
    id,
    email,
    name,
    phone,
    role,
    bakeries: memberships.map((m) => ({ ...m.bakery, memberRole: m.role })),
  });
});

const ProfileUpdate = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(30),
}).partial();

// Customers add a phone number so the bakery can reach them.
usersRouter.patch("/me", async (req, res) => {
  const data = ProfileUpdate.parse(req.body);
  const { id, email, name, phone, role } = await prisma.user.update({ where: { id: req.user!.id }, data });
  res.json({ id, email, name, phone, role });
});

// Called by the app/dashboard after obtaining an FCM token so the user can receive push notifications.
usersRouter.post("/me/fcm-tokens", async (req, res) => {
  const { token } = z.object({ token: z.string().min(1) }).parse(req.body);
  const user = req.user!;
  if (!user.fcmTokens.includes(token)) {
    await prisma.user.update({ where: { id: user.id }, data: { fcmTokens: { push: token } } });
  }
  res.status(204).end();
});
