import { BetStatus, PrismaClient, TemplateType } from '@prisma/client';

const prisma = new PrismaClient();

const addresses = [
  '8f2J2WQfPb2rM58eYvVxH2caN2J9b5zy4Z4NE7uB2nWb',
  '4kYB9S8MwY8Fa6mX8WmJw2qMtt5Sh7vT8QGqfH2rP1Ja',
  '9Lx2p3dCv5qZ7wR9tYn4bNm8aPq5rS2vB7kH3mX6cT2Q'
];

async function main() {
  await prisma.resolution.deleteMany();
  await prisma.bet.deleteMany();

  for (let i = 1; i <= 10; i += 1) {
    const type = i % 4 === 0 ? TemplateType.SPORTS_WINNER : i % 3 === 0 ? TemplateType.PRICE_RANGE : TemplateType.PRICE_ABOVE_BELOW;
    const status: BetStatus = i % 5 === 0 ? 'RESOLVED' : i % 2 === 0 ? 'MATCHED' : 'OPEN';

    const bet = await prisma.bet.create({
      data: {
        title: `Sample Bet ${i}`,
        description: `Oracle-template wager #${i}.`,
        templateType: type,
        assetBase: 'BTC',
        assetQuote: 'USD',
        threshold: type === 'PRICE_ABOVE_BELOW' ? 100000 + i * 500 : null,
        lowerBound: type === 'PRICE_RANGE' ? 90000 : null,
        upperBound: type === 'PRICE_RANGE' ? 110000 + i * 500 : null,
        resolveAt: new Date(Date.now() + i * 86400000),
        stakePerSide: 50 + i * 10,
        currencyLabel: i % 2 === 0 ? 'USDC' : 'SOL',
        creatorAddress: addresses[i % addresses.length],
        takerAddress: status === 'OPEN' ? null : addresses[(i + 1) % addresses.length],
        status,
        outcome: status === 'RESOLVED' ? (i % 2 === 0 ? 'CREATOR_WINS' : 'TAKER_WINS') : 'UNRESOLVED',
        xCreatorHandle: i % 2 === 0 ? `alpha${i}` : null,
        xOpponentHandle: i % 3 === 0 ? `beta${i}` : null,
        handlesPublic: i % 2 === 0,
        oracleSource: 'Chainlink price feed: BTC/USD'
      }
    });

    if (status === 'RESOLVED') {
      await prisma.resolution.create({
        data: {
          betId: bet.id,
          resolvedAt: new Date(),
          oracleValue: 100000 + i * 100,
          notes: 'Seeded simulated resolution.'
        }
      });
    }
  }
}

main().finally(async () => prisma.$disconnect());
