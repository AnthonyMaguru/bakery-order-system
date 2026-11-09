import { firebaseConfigured, firebaseMessaging } from "./firebase.js";
import { prisma, type NotificationType } from "./prisma.js";

interface NotificationPayload {
  title: string;
  body: string;
  orderId?: string;
  type?: NotificationType;
  link?: string;
}

function notificationLink(notification: NotificationPayload) {
  return notification.link ?? (
    notification.orderId ? `/orders/${notification.orderId}` : null
  );
}

// Saving history and sending push are independent best-effort operations.
async function persist(userIds: string[], notification: NotificationPayload) {
  const recipients = [...new Set(userIds)];
  if (!recipients.length) return;

  try {
    await prisma.notification.createMany({
      data: recipients.map((userId) => ({
        userId,
        type: notification.type ?? "ORDER_UPDATE",
        title: notification.title,
        body: notification.body,
        link: notificationLink(notification),
      })),
    });
  } catch (err) {
    console.error("Could not save notification history", err);
  }
}

// FCM accepts at most 500 tokens per multicast request.
async function send(tokens: string[], notification: NotificationPayload) {
  if (!firebaseConfigured) {
    console.info(`[push skipped, Firebase not configured] ${notification.title}: ${notification.body}`);
    return;
  }

  const uniqueTokens = [...new Set(tokens)];
  if (!uniqueTokens.length) return;

  const data: Record<string, string> = {
    type: notification.type ?? "ORDER_UPDATE",
  };

  if (notification.orderId) data.orderId = notification.orderId;

  const link = notificationLink(notification);
  if (link) data.link = link;

  try {
    for (let i = 0; i < uniqueTokens.length; i += 500) {
      await firebaseMessaging().sendEachForMulticast({
        tokens: uniqueTokens.slice(i, i + 500),
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data,
      });
    }
  } catch (err) {
    console.error("Push notification failed", err);
  }
}

export async function notifyUser(userId: string, notification: NotificationPayload) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fcmTokens: true },
    });

    if (!user) return;

    await persist([user.id], notification);
    await send(user.fcmTokens, notification);
  } catch (err) {
    console.error("User notification failed", err);
  }
}

// Every staff member of the bakery receives an individual notification.
export async function notifyBakery(bakeryId: string, notification: NotificationPayload) {
  try {
    const members = await prisma.bakeryMember.findMany({
      where: { bakeryId },
      select: {
        user: {
          select: { id: true, fcmTokens: true },
        },
      },
    });

    await persist(members.map((member) => member.user.id), notification);
    await send(members.flatMap((member) => member.user.fcmTokens), notification);
  } catch (err) {
    console.error("Bakery notification failed", err);
  }
}

// Platform administrators receive new bakery application notifications.
export async function notifyAdmins(notification: NotificationPayload) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, fcmTokens: true },
    });

    await persist(admins.map((admin) => admin.id), notification);
    await send(admins.flatMap((admin) => admin.fcmTokens), notification);
  } catch (err) {
    console.error("Administrator notification failed", err);
  }
}
