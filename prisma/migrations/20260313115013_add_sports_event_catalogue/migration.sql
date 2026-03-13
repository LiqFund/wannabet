-- CreateEnum
CREATE TYPE "SportsEventStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'FINAL', 'POSTPONED', 'CANCELED', 'DELAYED', 'SUSPENDED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "SportsEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "homeTeamCode" TEXT,
    "awayTeamCode" TEXT,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "scheduledStartUtc" TIMESTAMP(3) NOT NULL,
    "status" "SportsEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "finalConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "winnerTeamId" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "season" INTEGER,
    "seasonType" INTEGER,
    "eventDayUtc" TIMESTAMP(3),
    "updatedAtProviderUtc" TIMESTAMP(3),
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SportsEvent_sport_league_scheduledStartUtc_idx" ON "SportsEvent"("sport", "league", "scheduledStartUtc");

-- CreateIndex
CREATE INDEX "SportsEvent_status_scheduledStartUtc_idx" ON "SportsEvent"("status", "scheduledStartUtc");

-- CreateIndex
CREATE UNIQUE INDEX "SportsEvent_provider_providerEventId_key" ON "SportsEvent"("provider", "providerEventId");
