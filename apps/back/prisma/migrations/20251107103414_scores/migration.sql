/*
  Warnings:

  - Added the required column `accuracy` to the `Score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `goodCount` to the `Score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `greatCount` to the `Score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxCombo` to the `Score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mehCount` to the `Score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `missCount` to the `Score` table without a default value. This is not possible if the table is not empty.
  - Added the required column `perfectCount` to the `Score` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Score" ADD COLUMN     "accuracy" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "goodCount" INTEGER NOT NULL,
ADD COLUMN     "greatCount" INTEGER NOT NULL,
ADD COLUMN     "maxCombo" INTEGER NOT NULL,
ADD COLUMN     "mehCount" INTEGER NOT NULL,
ADD COLUMN     "missCount" INTEGER NOT NULL,
ADD COLUMN     "perfectCount" INTEGER NOT NULL;
