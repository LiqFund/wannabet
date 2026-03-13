export type UpcomingNbaEvent = {
  id: string;
  provider: string;
  providerEventId: string;
  sport: "nba";
  league: "NBA";
  awayTeamId: string;
  homeTeamId: string;
  awayTeamCode: string | null;
  homeTeamCode: string | null;
  awayTeamName: string;
  homeTeamName: string;
  scheduledStartUtc: string;
  status: string;
  finalConfirmed: boolean;
};

export type UpcomingNbaEventsResponse = {
  events: UpcomingNbaEvent[];
};
