ALTER TABLE "Bakery"
  ADD COLUMN "region" TEXT NOT NULL DEFAULT 'Central Region',
  ADD COLUMN "municipality" TEXT NOT NULL DEFAULT 'Kampala',
  ADD COLUMN "division" TEXT;

ALTER TABLE "BakeryApplication"
  ADD COLUMN "region" TEXT NOT NULL DEFAULT 'Central Region',
  ADD COLUMN "municipality" TEXT NOT NULL DEFAULT 'Kampala',
  ADD COLUMN "division" TEXT;

ALTER TABLE "Bakery"
  ALTER COLUMN "handoverTimes" SET DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "DeliveryZone" (
  "id" TEXT NOT NULL,
  "bakeryId" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "municipality" TEXT NOT NULL,
  "division" TEXT,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

INSERT INTO "DeliveryZone" ("id", "bakeryId", "region", "municipality", "name", "updatedAt")
SELECT DISTINCT
  md5(b."id" || ':' || area || ':delivery-zone'),
  b."id",
  b."region",
  b."city",
  area,
  CURRENT_TIMESTAMP
FROM "Bakery" b
CROSS JOIN LATERAL unnest(b."deliveryAreas") AS areas(area);

ALTER TABLE "Order"
  ADD COLUMN "commissionRateBps" INTEGER,
  ADD COLUMN "commissionAmount" INTEGER,
  ADD COLUMN "deliveryAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryZoneId" TEXT,
  ADD COLUMN "deliveryRegion" TEXT,
  ADD COLUMN "deliveryMunicipality" TEXT,
  ADD COLUMN "deliveryDivision" TEXT,
  ADD COLUMN "deliveryZoneName" TEXT,
  ADD COLUMN "deliveryLandmark" TEXT,
  ADD COLUMN "deliveryLatitude" DOUBLE PRECISION,
  ADD COLUMN "deliveryLongitude" DOUBLE PRECISION;

UPDATE "Order" o
SET "deliveryAmount" = o."deliveryFee",
    "deliveryRegion" = z."region",
    "deliveryMunicipality" = z."municipality",
    "deliveryDivision" = z."division",
    "deliveryZoneName" = z."name",
    "deliveryZoneId" = z."id"
FROM "DeliveryZone" z
WHERE o."bakeryId" = z."bakeryId"
  AND lower(o."deliveryArea") = lower(z."name");

CREATE TABLE "PlatformSettings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "commissionRateBps" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BakeryReview" (
  "id" TEXT NOT NULL,
  "bakeryId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "body" TEXT,
  "response" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BakeryReview_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Quotation"
  ADD COLUMN "deliveryAmount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "BakeryReview"
  ADD CONSTRAINT "BakeryReview_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "Bakery"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BakeryReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "BakeryReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliveryZone"
  ADD CONSTRAINT "DeliveryZone_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "Bakery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_deliveryZoneId_fkey" FOREIGN KEY ("deliveryZoneId") REFERENCES "DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "DeliveryZone_bakeryId_region_municipality_division_name_key"
  ON "DeliveryZone"("bakeryId", "region", "municipality", "division", "name");
CREATE INDEX "DeliveryZone_bakeryId_region_municipality_idx"
  ON "DeliveryZone"("bakeryId", "region", "municipality");
CREATE UNIQUE INDEX "BakeryReview_orderId_key" ON "BakeryReview"("orderId");
CREATE INDEX "BakeryReview_bakeryId_createdAt_idx" ON "BakeryReview"("bakeryId", "createdAt");
CREATE INDEX "Order_deliveryZoneId_idx" ON "Order"("deliveryZoneId");

ALTER TABLE "Order" DROP COLUMN "estimate";
ALTER TABLE "Order" DROP COLUMN "deliveryArea";
ALTER TABLE "Order" DROP COLUMN "deliveryFee";
ALTER TABLE "Bakery" DROP COLUMN "deliveryAreas";
ALTER TABLE "Bakery" DROP COLUMN "deliveryFee";
