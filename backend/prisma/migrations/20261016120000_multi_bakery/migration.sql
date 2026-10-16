-- Multi-bakery model, builder options, stock, capacity and payment records.
--
-- Written by hand from `prisma migrate diff` so existing local data survives:
-- renamed columns keep their values, and any products or orders created before
-- this migration are moved to a "Pilot bakery" whose owners are the former STAFF users.

-- ---------------------------------------------------------------------------
-- New enums
-- ---------------------------------------------------------------------------
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'STAFF');
CREATE TYPE "ProductCategory" AS ENUM ('CAKE', 'CUPCAKE', 'BREAD', 'PASTRY', 'COOKIE', 'EXTRA');
CREATE TYPE "OptionKind" AS ENUM ('SHAPE', 'TIERS', 'SIZE', 'FLAVOUR', 'ICING_COLOUR', 'DECORATION', 'OTHER');
CREATE TYPE "CancelledBy" AS ENUM ('CUSTOMER', 'BAKERY');
ALTER TYPE "OrderStatus" ADD VALUE 'QUOTED' AFTER 'SUBMITTED';

-- ---------------------------------------------------------------------------
-- New tables
-- ---------------------------------------------------------------------------
CREATE TABLE "Bakery" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "about" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'UG',
    "currency" TEXT NOT NULL DEFAULT 'UGX',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Kampala',
    "imageUrl" TEXT,
    "deliveryAreas" TEXT[],
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "pickupAvailable" BOOLEAN NOT NULL DEFAULT true,
    "acceptsCash" BOOLEAN NOT NULL DEFAULT true,
    "acceptsMobileMoney" BOOLEAN NOT NULL DEFAULT true,
    "mobileMoneyNumber" TEXT,
    "customCakesPerDay" INTEGER NOT NULL DEFAULT 4,
    "customNoticeDays" INTEGER NOT NULL DEFAULT 3,
    "closedWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bakery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BakeryMember" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BakeryMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BlockedDate" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,

    CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OptionGroup" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL DEFAULT 'CAKE',
    "kind" "OptionKind" NOT NULL,
    "name" TEXT NOT NULL,
    "multiple" BOOLEAN NOT NULL DEFAULT false,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "value" TEXT,
    "serves" INTEGER,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "stockItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "bakeryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lowAt" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderSelection" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "optionId" TEXT,
    "groupName" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "value" TEXT,
    "price" INTEGER NOT NULL,

    CONSTRAINT "OrderSelection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Existing data: a pilot bakery for products and orders made before this change
-- ---------------------------------------------------------------------------
INSERT INTO "Bakery" ("id", "slug", "name", "city", "updatedAt")
SELECT 'pilot', 'pilot', 'Pilot bakery', 'Kampala', CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "Product") OR EXISTS (SELECT 1 FROM "Order");

INSERT INTO "BakeryMember" ("id", "bakeryId", "userId", "role")
SELECT 'pilot-' || "id", 'pilot', "id", 'OWNER'
FROM "User"
WHERE "role" = 'STAFF' AND EXISTS (SELECT 1 FROM "Bakery" WHERE "id" = 'pilot');

-- Staff now come from BakeryMember, so the platform role keeps only CUSTOMER and ADMIN.
CREATE TYPE "Role_new" AS ENUM ('CUSTOMER', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new"
    USING (CASE WHEN "role"::text = 'STAFF' THEN 'CUSTOMER' ELSE "role"::text END)::"Role_new";
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';

-- ---------------------------------------------------------------------------
-- Product
-- ---------------------------------------------------------------------------
ALTER TABLE "Product" RENAME COLUMN "basePriceUgx" TO "price";
UPDATE "Product" SET "price" = 0 WHERE "price" IS NULL;
ALTER TABLE "Product" ALTER COLUMN "price" SET NOT NULL;

ALTER TABLE "Product"
    ADD COLUMN "bakeryId" TEXT,
    ADD COLUMN "customisable" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "leadTimeDays" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "serves" INTEGER,
    ADD COLUMN "sizeLabel" TEXT;
UPDATE "Product" SET "bakeryId" = 'pilot';
ALTER TABLE "Product" ALTER COLUMN "bakeryId" SET NOT NULL;

ALTER TABLE "Product" ALTER COLUMN "category" TYPE "ProductCategory" USING (
    CASE lower("category")
        WHEN 'cake' THEN 'CAKE'
        WHEN 'cupcake' THEN 'CUPCAKE'
        WHEN 'cupcakes' THEN 'CUPCAKE'
        WHEN 'bread' THEN 'BREAD'
        WHEN 'pastry' THEN 'PASTRY'
        WHEN 'cookie' THEN 'COOKIE'
        ELSE 'EXTRA'
    END
)::"ProductCategory";
UPDATE "Product" SET "customisable" = true WHERE "category" = 'CAKE';

-- ---------------------------------------------------------------------------
-- Order
-- ---------------------------------------------------------------------------
DROP INDEX "Order_status_dueDate_idx";

ALTER TABLE "Order" RENAME COLUMN "budgetUgx" TO "budget";
ALTER TABLE "Order" RENAME COLUMN "amountPaidUgx" TO "amountPaid";

ALTER TABLE "Order"
    ADD COLUMN "bakeryId" TEXT,
    ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'UGX',
    ADD COLUMN "cancelReason" TEXT,
    ADD COLUMN "cancelledBy" "CancelledBy",
    ADD COLUMN "clientRequestId" TEXT,
    ADD COLUMN "deliveryArea" TEXT,
    ADD COLUMN "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "designImageUrl" TEXT,
    ADD COLUMN "estimate" INTEGER,
    ADD COLUMN "number" SERIAL NOT NULL,
    ADD COLUMN "total" INTEGER;
UPDATE "Order" SET "bakeryId" = 'pilot';
ALTER TABLE "Order" ALTER COLUMN "bakeryId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "currency" DROP DEFAULT;

-- Payments used to be one amount and method on the order; keep them as a payment record.
INSERT INTO "Payment" ("id", "orderId", "amount", "method", "note", "recordedById")
SELECT 'migrated-' || "id", "id", "amountPaid", COALESCE("paymentMethod", 'CASH'), 'Recorded before payment history existed', "customerId"
FROM "Order"
WHERE "amountPaid" > 0;
ALTER TABLE "Order" DROP COLUMN "paymentMethod";

-- ---------------------------------------------------------------------------
-- OrderItem and Quotation
-- ---------------------------------------------------------------------------
ALTER TABLE "OrderItem" ADD COLUMN "unitPrice" INTEGER;
UPDATE "OrderItem" SET "unitPrice" = "Product"."price"
FROM "Product" WHERE "Product"."id" = "OrderItem"."productId";
UPDATE "OrderItem" SET "unitPrice" = 0 WHERE "unitPrice" IS NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "unitPrice" SET NOT NULL;

ALTER TABLE "Quotation" RENAME COLUMN "amountUgx" TO "amount";
ALTER TABLE "Quotation" ADD COLUMN "acceptedAt" TIMESTAMP(3);

-- OrderComment: mark messages from the bakery, which used to be told apart by the STAFF role.
ALTER TABLE "OrderComment" ADD COLUMN "fromBakery" BOOLEAN NOT NULL DEFAULT false;
UPDATE "OrderComment" SET "fromBakery" = true
WHERE "authorId" IN (SELECT "userId" FROM "BakeryMember");

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "Bakery_slug_key" ON "Bakery"("slug");
CREATE INDEX "BakeryMember_userId_idx" ON "BakeryMember"("userId");
CREATE UNIQUE INDEX "BakeryMember_bakeryId_userId_key" ON "BakeryMember"("bakeryId", "userId");
CREATE UNIQUE INDEX "BlockedDate_bakeryId_date_key" ON "BlockedDate"("bakeryId", "date");
CREATE INDEX "OptionGroup_bakeryId_category_idx" ON "OptionGroup"("bakeryId", "category");
CREATE INDEX "Option_groupId_idx" ON "Option"("groupId");
CREATE UNIQUE INDEX "StockItem_bakeryId_name_key" ON "StockItem"("bakeryId", "name");
CREATE INDEX "Product_bakeryId_category_idx" ON "Product"("bakeryId", "category");
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");
CREATE INDEX "Order_bakeryId_status_dueDate_idx" ON "Order"("bakeryId", "status", "dueDate");
CREATE UNIQUE INDEX "Order_customerId_clientRequestId_key" ON "Order"("customerId", "clientRequestId");

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------
ALTER TABLE "BakeryMember" ADD CONSTRAINT "BakeryMember_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "Bakery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BakeryMember" ADD CONSTRAINT "BakeryMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlockedDate" ADD CONSTRAINT "BlockedDate_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "Bakery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "Bakery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OptionGroup" ADD CONSTRAINT "OptionGroup_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "Bakery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Option" ADD CONSTRAINT "Option_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Option" ADD CONSTRAINT "Option_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "Bakery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_bakeryId_fkey" FOREIGN KEY ("bakeryId") REFERENCES "Bakery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderSelection" ADD CONSTRAINT "OrderSelection_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderSelection" ADD CONSTRAINT "OrderSelection_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
