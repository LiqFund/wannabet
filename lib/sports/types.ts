export type CanonicalSport = "nba";

export type CanonicalLeague = "NBA";

export type CanonicalSportsEventStatus =
  | "scheduled"
  | "in_progress"
  | "final"
  | "postponed"
  | "canceled"
  | "delayed"
  | "suspended"
  | "unknown";

export type CanonicalSportsEvent = {
  provider: "sportsdataio";
  providerEventId: string;

  sport: CanonicalSport;
  league: CanonicalLeague;

  homeTeamId: string;
  awayTeamId: string;
  homeTeamCode: string | null;
  awayTeamCode: string | null;
  homeTeamName: string;
  awayTeamName: string;

  scheduledStartUtc: string;
  status: CanonicalSportsEventStatus;
  finalConfirmed: boolean;

  winnerTeamId: string | null;

  homeScore: number | null;
  awayScore: number | null;

  season: number | null;
  seasonType: number | null;
  eventDayUtc: string | null;

  updatedAtProviderUtc: string | null;

  raw: unknown;
};
