import { firebaseConfigured, firebaseMessaging } from "./firebase.js";
import { prisma } from "./prisma.js";

interface Notification {
  title: string;
  body: string;
  orderId: string;
}

// Best effort: a failed push must never fail the request that triggered it.
export async function notifyUser(userId: string, { title, body, orderId }: Notification) {
  if (!firebaseConfigured) {
    console.info(`[push skipped, Firebase not configured] ${title}: ${body}`);
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmTokens: true } });
    if (!user?.fcmTokens.length) return;
    await firebaseMessaging().sendEachForMulticast({
      tokens: user.fcmTokens,
      notification: { title, body },
      data: { orderId },
    });
  } catch (err) {
    console.error("Push notification failed", err);
  }
}
