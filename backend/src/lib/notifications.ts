import { firebaseConfigured, firebaseMessaging } from "./firebase.js";
import { prisma } from "./prisma.js";

interface Notification {
  title: string;
  body: string;
  orderId: string;
}

// Best effort: a failed push must never fail the request that triggered it.
async function send(tokens: string[], { title, body, orderId }: Notification) {
  if (!firebaseConfigured) {
    console.info(`[push skipped, Firebase not configured] ${title}: ${body}`);
    return;
  }
  if (!tokens.length) return;
  try {
    await firebaseMessaging().sendEachForMulticast({ tokens, notification: { title, body }, data: { orderId } });
  } catch (err) {
    console.error("Push notification failed", err);
  }
}

export async function notifyUser(userId: string, notification: Notification) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmTokens: true } });
    await send(user?.fcmTokens ?? [], notification);
  } catch (err) {
    console.error("Push notification failed", err);
  }
}

// Every staff member of the bakery, e.g. for a new order.
export async function notifyBakery(bakeryId: string, notification: Notification) {
  try {
    const members = await prisma.bakeryMember.findMany({
      where: { bakeryId },
      select: { user: { select: { fcmTokens: true } } },
    });
    await send(members.flatMap((m) => m.user.fcmTokens), notification);
  } catch (err) {
    console.error("Push notification failed", err);
  }
}
