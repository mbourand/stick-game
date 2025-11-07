/*
  Warnings:

  - The primary key for the `Score` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Score` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Score" DROP CONSTRAINT "Score_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "Score_pkey" PRIMARY KEY ("playerName", "beatmapId");
