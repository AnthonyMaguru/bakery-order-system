import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/me", (req, res) => {
  const { id, email, name, phone, role } = req.user!;
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
