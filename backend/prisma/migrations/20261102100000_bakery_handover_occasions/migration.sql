-- These columns were added to schema.prisma without a migration.
ALTER TABLE "Bakery" ADD COLUMN IF NOT EXISTS "handoverTimes" TEXT[] DEFAULT ARRAY['10:00', '14:00', '17:00']::TEXT[],
ADD COLUMN IF NOT EXISTS "occasions" TEXT[] DEFAULT ARRAY['Birthday', 'Wedding', 'Introduction', 'Graduation', 'Baby shower', 'Other']::TEXT[];
