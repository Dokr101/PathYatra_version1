-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "destinationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ACTIVITY',
    "description" TEXT,
    "durationHours" REAL,
    "costEstimate" DECIMAL,
    "costUpdatedAt" DATETIME,
    "difficulty" TEXT,
    "bestSeason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activity_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Activity" ("bestSeason", "costEstimate", "costUpdatedAt", "createdAt", "description", "destinationId", "difficulty", "durationHours", "id", "name", "status", "type", "updatedAt") SELECT "bestSeason", "costEstimate", "costUpdatedAt", "createdAt", "description", "destinationId", "difficulty", "durationHours", "id", "name", "status", "type", "updatedAt" FROM "Activity";
DROP TABLE "Activity";
ALTER TABLE "new_Activity" RENAME TO "Activity";
CREATE INDEX "Activity_destinationId_idx" ON "Activity"("destinationId");
CREATE TABLE "new_Destination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "shortDescription" TEXT,
    "overview" TEXT,
    "highlights" TEXT,
    "localFood" TEXT,
    "travelEssentials" TEXT,
    "bestSeason" TEXT,
    "recommendedDurationDays" INTEGER,
    "difficultyLevel" TEXT NOT NULL DEFAULT 'easy',
    "costPerPersonPerDay" DECIMAL,
    "latitude" REAL,
    "longitude" REAL,
    "imagePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Destination_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Destination" ("bestSeason", "categoryId", "costPerPersonPerDay", "createdAt", "difficultyLevel", "district", "highlights", "id", "imagePath", "latitude", "localFood", "longitude", "name", "overview", "province", "recommendedDurationDays", "shortDescription", "slug", "status", "travelEssentials", "updatedAt") SELECT "bestSeason", "categoryId", "costPerPersonPerDay", "createdAt", "difficultyLevel", "district", "highlights", "id", "imagePath", "latitude", "localFood", "longitude", "name", "overview", "province", "recommendedDurationDays", "shortDescription", "slug", "status", "travelEssentials", "updatedAt" FROM "Destination";
DROP TABLE "Destination";
ALTER TABLE "new_Destination" RENAME TO "Destination";
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");
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
    CONSTRAINT "Itinerary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Itinerary_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Itinerary" ("clientPlan", "createdAt", "destinationId", "endDate", "id", "numTravelers", "startDate", "startingPoint", "status", "title", "totalBudget", "userId") SELECT "clientPlan", "createdAt", "destinationId", "endDate", "id", "numTravelers", "startDate", "startingPoint", "status", "title", "totalBudget", "userId" FROM "Itinerary";
DROP TABLE "Itinerary";
ALTER TABLE "new_Itinerary" RENAME TO "Itinerary";
CREATE TABLE "new_ItineraryStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayId" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimatedCost" DECIMAL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ItineraryStop_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ItineraryDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ItineraryStop" ("dayId", "description", "estimatedCost", "id", "sortOrder", "timeSlot", "title") SELECT "dayId", "description", "estimatedCost", "id", "sortOrder", "timeSlot", "title" FROM "ItineraryStop";
DROP TABLE "ItineraryStop";
ALTER TABLE "new_ItineraryStop" RENAME TO "ItineraryStop";
CREATE TABLE "new_ItineraryTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "destinationId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT,
    "difficulty" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 1,
    "estimatedCost" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ItineraryTemplate_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ItineraryTemplate" ("createdAt", "destinationId", "difficulty", "durationDays", "estimatedCost", "id", "slug", "status", "summary", "title", "updatedAt") SELECT "createdAt", "destinationId", "difficulty", "durationDays", "estimatedCost", "id", "slug", "status", "summary", "title", "updatedAt" FROM "ItineraryTemplate";
DROP TABLE "ItineraryTemplate";
ALTER TABLE "new_ItineraryTemplate" RENAME TO "ItineraryTemplate";
CREATE UNIQUE INDEX "ItineraryTemplate_slug_key" ON "ItineraryTemplate"("slug");
CREATE INDEX "ItineraryTemplate_destinationId_idx" ON "ItineraryTemplate"("destinationId");
CREATE TABLE "new_TemplateStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayId" TEXT NOT NULL,
    "timeSlot" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimatedCost" DECIMAL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TemplateStop_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "TemplateDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TemplateStop" ("dayId", "description", "estimatedCost", "id", "sortOrder", "timeSlot", "title") SELECT "dayId", "description", "estimatedCost", "id", "sortOrder", "timeSlot", "title" FROM "TemplateStop";
DROP TABLE "TemplateStop";
ALTER TABLE "new_TemplateStop" RENAME TO "TemplateStop";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
