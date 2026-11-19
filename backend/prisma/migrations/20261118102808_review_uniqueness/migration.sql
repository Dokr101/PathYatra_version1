/*
  One review per (userId, destinationId).

  Existing databases may already hold duplicates — the API never refused them —
  so keep the most useful row per pair (an approved review first, then the latest)
  and delete the rest before the unique index is created.
*/
DELETE FROM "Review"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "userId", "destinationId"
        ORDER BY
          CASE "status" WHEN 'APPROVED' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,
          "createdAt" DESC,
          "id" DESC
      ) AS "rank"
    FROM "Review"
  )
  WHERE "rank" > 1
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_destinationId_key" ON "Review"("userId", "destinationId");
