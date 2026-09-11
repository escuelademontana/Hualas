CREATE TABLE "SavedLocation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SavedLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedLocation_name_key" ON "SavedLocation"("name");
CREATE INDEX "SavedLocation_name_idx" ON "SavedLocation"("name");

ALTER TABLE "SavedLocation" ADD CONSTRAINT "SavedLocation_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
