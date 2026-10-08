// Stretch feature (concept paper 3.3): flag orders that are close to their due date
// but have had no staff action recently, and notify staff via FCM.
//
// Suggested rule to start with: status is SUBMITTED or CONFIRMED, dueDate is within
// 48 hours, and updatedAt is more than 24 hours ago. Run it hourly with setInterval.

export function startDeadlineReminderJob() {
  // TODO(backend lead): query open orders with Prisma and send FCM notifications to staff.
}
