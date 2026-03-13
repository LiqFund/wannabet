import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { CanonicalSportsEvent } from "@/lib/sports/types";

function mapStatusToPrisma(status: CanonicalSportsEvent["status"]) {
  switch (status) {
    case "scheduled":
      return "SCHEDULED";
    case "in_progress":
      return "IN_PROGRESS";
    case "final":
      return "FINAL";
    case "postponed":
      return "POSTPONED";
    case "canceled":
      return "CANCELED";
    case "delayed":
      return "DELAYED";
    case "suspended":
      return "SUSPENDED";
    default:
      return "UNKNOWN";
  }
}

export async function upsertSportsEvent(event: CanonicalSportsEvent) {
  const rawJson = event.raw as Prisma.InputJsonValue;

  return prisma.sportsEvent.upsert({
    where: {
      provider_providerEventId: {
        provider: event.provider,
        providerEventId: event.providerEventId,
      },
    },
    create: {
      provider: event.provider,
      providerEventId: event.providerEventId,
      sport: event.sport,
      league: event.league,

      homeTeamId: event.homeTeamId,
      awayTeamId: event.awayTeamId,
      homeTeamCode: event.homeTeamCode,
      awayTeamCode: event.awayTeamCode,
      homeTeamName: event.homeTeamName,
      awayTeamName: event.awayTeamName,

      scheduledStartUtc: new Date(event.scheduledStartUtc),
      status: mapStatusToPrisma(event.status),
      finalConfirmed: event.finalConfirmed,

      winnerTeamId: event.winnerTeamId,

      homeScore: event.homeScore,
      awayScore: event.awayScore,

      season: event.season,
      seasonType: event.seasonType,
      eventDayUtc: event.eventDayUtc ? new Date(event.eventDayUtc) : null,

      updatedAtProviderUtc: event.updatedAtProviderUtc
        ? new Date(event.updatedAtProviderUtc)
        : null,

      rawJson,
    },
    update: {
      sport: event.sport,
      league: event.league,

      homeTeamId: event.homeTeamId,
      awayTeamId: event.awayTeamId,
      homeTeamCode: event.homeTeamCode,
      awayTeamCode: event.awayTeamCode,
      homeTeamName: event.homeTeamName,
      awayTeamName: event.awayTeamName,

      scheduledStartUtc: new Date(event.scheduledStartUtc),
      status: mapStatusToPrisma(event.status),
      finalConfirmed: event.finalConfirmed,

      winnerTeamId: event.winnerTeamId,

      homeScore: event.homeScore,
      awayScore: event.awayScore,

      season: event.season,
      seasonType: event.seasonType,
      eventDayUtc: event.eventDayUtc ? new Date(event.eventDayUtc) : null,

      updatedAtProviderUtc: event.updatedAtProviderUtc
        ? new Date(event.updatedAtProviderUtc)
        : null,

      rawJson,
    },
  });
}
