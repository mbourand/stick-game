-- CreateTable
CREATE TABLE "DailyFeature" (
    "date" TEXT NOT NULL,
    "beatmapsetId" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "featuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyFeature_pkey" PRIMARY KEY ("date")
);
