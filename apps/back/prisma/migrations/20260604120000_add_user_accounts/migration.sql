-- AlterTable
ALTER TABLE "Score" DROP CONSTRAINT "Score_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "userId" TEXT,
ADD CONSTRAINT "Score_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "discordId" TEXT,
    "googleId" TEXT,
    "avatarData" BYTEA,
    "avatarMime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "Score_beatmapId_scoreVersion_modded_score_idx" ON "Score"("beatmapId", "scoreVersion", "modded", "score");

-- CreateIndex
CREATE UNIQUE INDEX "Score_userId_beatmapId_scoreVersion_modded_key" ON "Score"("userId", "beatmapId", "scoreVersion", "modded");

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
