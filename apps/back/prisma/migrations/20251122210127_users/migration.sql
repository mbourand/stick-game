-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "hashedPassword" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "totalSubmittedScores" INTEGER NOT NULL DEFAULT 0,
    "accuracySum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performancePoints" INTEGER NOT NULL DEFAULT 0,
    "ssCount" INTEGER NOT NULL DEFAULT 0,
    "fullComboCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
