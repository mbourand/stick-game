-- AlterTable
ALTER TABLE "Score" DROP CONSTRAINT "Score_pkey",
ADD COLUMN     "modded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mods" TEXT NOT NULL DEFAULT '',
ADD CONSTRAINT "Score_pkey" PRIMARY KEY ("playerName", "beatmapId", "scoreVersion", "modded");

