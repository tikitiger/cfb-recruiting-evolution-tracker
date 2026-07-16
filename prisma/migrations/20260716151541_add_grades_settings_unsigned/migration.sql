-- AlterTable
ALTER TABLE "TeamSeasonStat" ADD COLUMN "avgGrade" REAL;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeAtmosphere" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeBrand" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeBudget" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeConference" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeTraditions" TEXT;

-- CreateTable
CREATE TABLE "SeasonSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "cpuTransferChance" INTEGER,
    "userTransferChance" INTEGER,
    "maxTransfersPerTeam" INTEGER,
    "recruitFlipping" BOOLEAN,
    "skillLevel" TEXT,
    "progressionFreq" TEXT,
    "talentProgressSpeed" TEXT,
    "xpPenalty" INTEGER,
    "xpQB" INTEGER,
    "xpHB" INTEGER,
    "xpWR" INTEGER,
    "xpTE" INTEGER,
    "xpT" INTEGER,
    "xpG" INTEGER,
    "xpC" INTEGER,
    "xpDE" INTEGER,
    "xpDT" INTEGER,
    "xpOLB" INTEGER,
    "xpMLB" INTEGER,
    "xpCB" INTEGER,
    "xpFS" INTEGER,
    "xpSS" INTEGER,
    "xpK" INTEGER,
    "xpP" INTEGER,
    "unsignedTotal" INTEGER,
    "unsignedFiveStar" INTEGER,
    "unsignedFourStar" INTEGER,
    "unsignedThreeStar" INTEGER,
    "unsignedTwoStar" INTEGER,
    "unsignedOneStar" INTEGER,
    "unsignedHS" INTEGER,
    "unsignedTransfer" INTEGER,
    CONSTRAINT "SeasonSettings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonSettings_seasonId_key" ON "SeasonSettings"("seasonId");
