ALTER TABLE "BakeryApplication" ADD COLUMN "bakeryId" TEXT;
CREATE UNIQUE INDEX "BakeryApplication_bakeryId_key" ON "BakeryApplication"("bakeryId");
ALTER TABLE "BakeryApplication"
ADD CONSTRAINT "BakeryApplication_bakeryId_fkey"
FOREIGN KEY ("bakeryId") REFERENCES "Bakery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
