-- CreateIndex
CREATE INDEX "Itinerary_userId_idx" ON "Itinerary"("userId");

-- CreateIndex
CREATE INDEX "Itinerary_destinationId_idx" ON "Itinerary"("destinationId");

-- CreateIndex
CREATE INDEX "ItineraryDay_itineraryId_idx" ON "ItineraryDay"("itineraryId");

-- CreateIndex
CREATE INDEX "ItineraryStop_dayId_idx" ON "ItineraryStop"("dayId");

-- CreateIndex
CREATE INDEX "TemplateStop_dayId_idx" ON "TemplateStop"("dayId");

