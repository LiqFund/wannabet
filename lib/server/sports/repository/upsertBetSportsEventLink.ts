import { prisma } from "@/lib/prisma";
import type { UpcomingNbaEvent } from "@/lib/sports/upcomingNba";

export async function upsertBetSportsEventLink(params: {
  betPubkey: string;
  event: UpcomingNbaEvent;
}) {
  const { betPubkey, event } = params;

  return prisma.betSportsEventLink.upsert({
    where: {
      betPubkey,
    },
    create: {
      betPubkey,
      provider: event.provider,
      providerEventId: event.providerEventId,
      sport: event.sport,
      league: event.league,
      awayTeamName: event.awayTeamName,
      homeTeamName: event.homeTeamName,
      scheduledStartUtc: new Date(event.scheduledStartUtc),
    },
    update: {
      provider: event.provider,
      providerEventId: event.providerEventId,
      sport: event.sport,
      league: event.league,
      awayTeamName: event.awayTeamName,
      homeTeamName: event.homeTeamName,
      scheduledStartUtc: new Date(event.scheduledStartUtc),
    },
  });
}
