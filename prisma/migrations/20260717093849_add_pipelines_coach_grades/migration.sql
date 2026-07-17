-- AlterTable
ALTER TABLE "TeamSeasonStat" ADD COLUMN "coachArchetype" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "coachLevel" INTEGER;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "coachName" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeAcademic" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeCampus" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeChampion" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeCoachPrestige" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeCoachStability" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeProDB" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeProDL" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeProK" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeProLB" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeProOL" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeProP" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeProQB" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeProRB" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeProTE" TEXT;
ALTER TABLE "TeamSeasonStat" ADD COLUMN "gradeProWR" TEXT;

-- CreateTable
CREATE TABLE "TeamPipeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "pipeline" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    CONSTRAINT "TeamPipeline_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamPipeline_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamPipeline_teamId_seasonId_pipeline_key" ON "TeamPipeline"("teamId", "seasonId", "pipeline");
