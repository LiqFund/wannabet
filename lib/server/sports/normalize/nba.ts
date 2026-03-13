import type {
  CanonicalSportsEvent,
  CanonicalSportsEventStatus,
} from "@/lib/sports/types";
import type {
  SportsDataIoNbaGame,
  SportsDataIoNbaTeam,
} from "@/lib/server/sportsdataio/nba";

function mapNbaStatus(status: string): CanonicalSportsEventStatus {
  switch (status) {
    case "Scheduled":
      return "scheduled";
    case "InProgress":
      return "in_progress";
    case "Final":
    case "F/OT":
      return "final";
    case "Postponed":
      return "postponed";
    case "Canceled":
      return "canceled";
    case "Delayed":
      return "delayed";
    case "Suspended":
      return "suspended";
    default:
      return "unknown";
  }
}

function buildTeamName(team: SportsDataIoNbaTeam | undefined, fallbackCode: string): string {
  if (!team) return fallbackCode;
  return `${team.City} ${team.Name}`.trim();
}

export function normalizeSportsDataIoNbaGame(params: {
  game: SportsDataIoNbaGame;
  teamsById: Map<number, SportsDataIoNbaTeam>;
}): CanonicalSportsEvent {
  const { game, teamsById } = params;

  const homeTeam = teamsById.get(game.HomeTeamID);
  const awayTeam = teamsById.get(game.AwayTeamID);

  const homeScore =
    typeof game.HomeTeamScore === "number" ? game.HomeTeamScore : null;
  const awayScore =
    typeof game.AwayTeamScore === "number" ? game.AwayTeamScore : null;

  let winnerTeamId: string | null = null;

  if (game.IsClosed && homeScore !== null && awayScore !== null) {
    if (homeScore > awayScore) {
      winnerTeamId = String(game.HomeTeamID);
    } else if (awayScore > homeScore) {
      winnerTeamId = String(game.AwayTeamID);
    }
  }

  return {
    provider: "sportsdataio",
    providerEventId: String(game.GameID),

    sport: "nba",
    league: "NBA",

    homeTeamId: String(game.HomeTeamID),
    awayTeamId: String(game.AwayTeamID),
    homeTeamCode: homeTeam?.Key ?? game.HomeTeam ?? null,
    awayTeamCode: awayTeam?.Key ?? game.AwayTeam ?? null,
    homeTeamName: buildTeamName(homeTeam, game.HomeTeam),
    awayTeamName: buildTeamName(awayTeam, game.AwayTeam),

    scheduledStartUtc: game.DateTimeUTC ?? game.DateTime,
    status: mapNbaStatus(game.Status),
    finalConfirmed: Boolean(game.IsClosed),

    winnerTeamId,

    homeScore,
    awayScore,

    season: typeof game.Season === "number" ? game.Season : null,
    seasonType: typeof game.SeasonType === "number" ? game.SeasonType : null,
    eventDayUtc: game.Day ?? null,

    updatedAtProviderUtc: game.Updated ?? null,

    raw: game,
  };
}
