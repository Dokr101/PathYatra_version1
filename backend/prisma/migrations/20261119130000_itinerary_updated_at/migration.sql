-- Add Itinerary.updatedAt so a trip carries a last-modified stamp like every
-- other writeable model. SQLite cannot add a NOT NULL column to a populated
-- table, so Prisma's diff rebuilds the table; the INSERT omits updatedAt, so
-- every existing row is backfilled from DEFAULT CURRENT_TIMESTAMP.
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Itinerary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startingPoint" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "numTravelers" INTEGER NOT NULL DEFAULT 1,
    "totalBudget" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "clientPlan" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Itinerary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Itinerary_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Itinerary" ("clientPlan", "createdAt", "destinationId", "endDate", "id", "numTravelers", "startDate", "startingPoint", "status", "title", "totalBudget", "userId") SELECT "clientPlan", "createdAt", "destinationId", "endDate", "id", "numTravelers", "startDate", "startingPoint", "status", "title", "totalBudget", "userId" FROM "Itinerary";
DROP TABLE "Itinerary";
ALTER TABLE "new_Itinerary" RENAME TO "Itinerary";
CREATE INDEX "Itinerary_userId_idx" ON "Itinerary"("userId");
CREATE INDEX "Itinerary_destinationId_idx" ON "Itinerary"("destinationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
