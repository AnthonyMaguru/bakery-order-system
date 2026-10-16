// Stretch feature (concept paper 3.3): flag orders that are close to their due date
// but have had no staff action recently, and notify staff via FCM.
//
// Suggested rule: the same one as `needsAttention` in bakeryOrderSummary()
// (src/modules/orders/orders.service.ts): an open status, due within 48 hours, and
// updatedAt more than 24 hours ago. Run it hourly with setInterval and send each
// bakery one message with notifyBakery() from src/lib/notifications.ts.

export function startDeadlineReminderJob() {
  // TODO(backend lead): query those orders per bakery and notify its staff.
}
