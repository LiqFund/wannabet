-- CreateTable
CREATE TABLE "BetSportsEventLink" (
    "id" TEXT NOT NULL,
    "betPubkey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "homeTeamName" TEXT NOT NULL,
    "scheduledStartUtc" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetSportsEventLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BetSportsEventLink_betPubkey_key" ON "BetSportsEventLink"("betPubkey");

-- CreateIndex
CREATE INDEX "BetSportsEventLink_sport_league_scheduledStartUtc_idx" ON "BetSportsEventLink"("sport", "league", "scheduledStartUtc");

-- CreateIndex
CREATE INDEX "BetSportsEventLink_provider_providerEventId_idx" ON "BetSportsEventLink"("provider", "providerEventId");
