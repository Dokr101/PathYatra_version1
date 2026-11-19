-- CreateTable
CREATE TABLE "FeaturedDestination" (
    "destinationId" TEXT NOT NULL PRIMARY KEY,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FeaturedDestination_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);


-- Move the JSON id list into the join table before the old column disappears.
-- Missing destinations are skipped; rows keep their array order in sortOrder.
INSERT INTO "FeaturedDestination" ("destinationId", "sortOrder")
SELECT "j"."value", "j"."key"
FROM "SiteSetting"
JOIN json_each("SiteSetting"."featuredDestinationIds") AS "j"
WHERE json_valid("SiteSetting"."featuredDestinationIds") = 1
  AND EXISTS (SELECT 1 FROM "Destination" "d" WHERE "d"."id" = "j"."value");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SiteSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "siteName" TEXT NOT NULL DEFAULT 'PathYatra',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SiteSetting" ("contactEmail", "contactPhone", "id", "siteName", "updatedAt") SELECT "contactEmail", "contactPhone", "id", "siteName", "updatedAt" FROM "SiteSetting";
DROP TABLE "SiteSetting";
ALTER TABLE "new_SiteSetting" RENAME TO "SiteSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FeaturedDestination_sortOrder_idx" ON "FeaturedDestination"("sortOrder");

