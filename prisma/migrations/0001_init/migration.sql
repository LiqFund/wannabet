-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "assetBase" TEXT NOT NULL,
    "assetQuote" TEXT NOT NULL,
    "threshold" DECIMAL,
    "lowerBound" DECIMAL,
    "upperBound" DECIMAL,
    "resolveAt" DATETIME NOT NULL,
    "stakePerSide" DECIMAL NOT NULL,
    "currencyLabel" TEXT NOT NULL,
    "creatorAddress" TEXT NOT NULL,
    "takerAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "outcome" TEXT NOT NULL DEFAULT 'UNRESOLVED',
    "xCreatorHandle" TEXT,
    "xOpponentHandle" TEXT,
    "handlesPublic" BOOLEAN NOT NULL DEFAULT false,
    "oracleSource" TEXT NOT NULL DEFAULT 'Simulated oracle metadata',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Resolution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "betId" TEXT NOT NULL,
    "resolvedAt" DATETIME NOT NULL,
    "oracleValue" DECIMAL,
    "notes" TEXT NOT NULL,
    CONSTRAINT "Resolution_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Resolution_betId_key" ON "Resolution"("betId");
