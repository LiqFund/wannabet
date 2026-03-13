import { prisma } from "@/lib/prisma";

export async function listUpcomingNbaEvents(limit = 25) {
  return prisma.sportsEvent.findMany({
    where: {
      sport: "nba",
      league: "NBA",
      scheduledStartUtc: {
        gte: new Date(),
      },
    },
    orderBy: {
      scheduledStartUtc: "asc",
    },
    take: limit,
    select: {
      id: true,
      provider: true,
      providerEventId: true,
      sport: true,
      league: true,
      awayTeamId: true,
      homeTeamId: true,
      awayTeamCode: true,
      homeTeamCode: true,
      awayTeamName: true,
      homeTeamName: true,
      scheduledStartUtc: true,
      status: true,
      finalConfirmed: true,
    },
  });
}
