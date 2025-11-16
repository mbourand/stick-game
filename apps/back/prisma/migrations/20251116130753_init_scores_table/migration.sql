-- CreateTable
CREATE TABLE "Score" (
    "playerName" TEXT NOT NULL,
    "beatmapId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxCombo" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "missCount" INTEGER NOT NULL,
    "mehCount" INTEGER NOT NULL,
    "goodCount" INTEGER NOT NULL,
    "greatCount" INTEGER NOT NULL,
    "perfectCount" INTEGER NOT NULL,
    "submissionTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("playerName","beatmapId")
);
