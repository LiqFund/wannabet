import { prisma } from "@/lib/prisma";

async function main() {
  const rows = await prisma.sportsEvent.findMany({
    take: 5,
    orderBy: { scheduledStartUtc: "asc" },
    select: {
      provider: true,
      providerEventId: true,
      sport: true,
      league: true,
      awayTeamName: true,
      homeTeamName: true,
      scheduledStartUtc: true,
      status: true,
      finalConfirmed: true,
      awayScore: true,
      homeScore: true,
      winnerTeamId: true,
    },
  });

  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
