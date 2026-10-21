ALTER TABLE "Order"
ADD COLUMN "lastReminderAt" TIMESTAMP(3);

CREATE INDEX "Order_bakeryId_lastReminderAt_idx"
ON "Order"("bakeryId", "lastReminderAt");
