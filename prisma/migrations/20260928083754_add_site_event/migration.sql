-- CreateTable
CREATE TABLE "SiteEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "vehicleId" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" INTEGER,
    "visitorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SiteEvent_type_createdAt_idx" ON "SiteEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "SiteEvent_vehicleId_idx" ON "SiteEvent"("vehicleId");

-- CreateIndex
CREATE INDEX "SiteEvent_visitorId_idx" ON "SiteEvent"("visitorId");
