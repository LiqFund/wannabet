const apiKey = process.env.SPORTSDATAIO_API_KEY;

if (!apiKey) {
  throw new Error("Missing SPORTSDATAIO_API_KEY");
}

const API_KEY: string = apiKey;
const BASE = "https://api.sportsdata.io/v3/nba/scores/json";

async function sportsDataIoGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      "Ocp-Apim-Subscription-Key": API_KEY,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SportsDataIO ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export type SportsDataIoNbaSeason = {
  Season: number;
  StartYear: number;
  EndYear: number;
  Description: string;
  RegularSeasonStartDate: string;
  PostSeasonStartDate: string;
  SeasonType: string;
  ApiSeason: string;
};

export type SportsDataIoNbaTeam = {
  TeamID: number;
  Key: string;
  Active: boolean;
  City: string;
  Name: string;
  LeagueID: number;
  StadiumID: number | null;
  Conference: string | null;
  Division: string | null;
};

export type SportsDataIoNbaGame = {
  GameID: number;
  Season: number;
  SeasonType: number;
  Status: string;
  Day: string;
  DateTime: string;
  DateTimeUTC?: string | null;
  AwayTeam: string;
  HomeTeam: string;
  AwayTeamID: number;
  HomeTeamID: number;
  AwayTeamScore?: number | null;
  HomeTeamScore?: number | null;
  Updated?: string | null;
  IsClosed?: boolean | null;
};

export async function getNbaCurrentSeason(): Promise<SportsDataIoNbaSeason> {
  return sportsDataIoGet<SportsDataIoNbaSeason>("CurrentSeason");
}

export async function getNbaTeams(): Promise<SportsDataIoNbaTeam[]> {
  return sportsDataIoGet<SportsDataIoNbaTeam[]>("teams");
}

export async function getNbaGamesByApiSeason(
  apiSeason: string,
): Promise<SportsDataIoNbaGame[]> {
  return sportsDataIoGet<SportsDataIoNbaGame[]>(`Games/${apiSeason}`);
}
