-- Public bakery applications are reviewed before a live bakery is created.
CREATE TYPE "BakeryApplicationStatus" AS ENUM ('PENDING', 'CONTACTED', 'APPROVED', 'DECLINED');

CREATE TABLE "BakeryApplication" (
    "id" TEXT NOT NULL,
    "bakeryName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "notes" TEXT,
    "status" "BakeryApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BakeryApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BakeryApplication_status_createdAt_idx" ON "BakeryApplication"("status", "createdAt");
CREATE INDEX "BakeryApplication_email_idx" ON "BakeryApplication"("email");
