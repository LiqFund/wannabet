import { normalizeSportsDataIoNbaGame } from "@/lib/server/sports/normalize/nba";
import {
  getNbaCurrentSeason,
  getNbaGamesByApiSeason,
  getNbaTeams,
} from "@/lib/server/sportsdataio/nba";
import { upsertSportsEvent } from "@/lib/server/sports/repository/sportsEvents";

export async function syncNbaCurrentSeason() {
  const currentSeason = await getNbaCurrentSeason();
  const teams = await getNbaTeams();
  const games = await getNbaGamesByApiSeason(currentSeason.ApiSeason);

  const teamsById = new Map(teams.map((team) => [team.TeamID, team]));

  let syncedCount = 0;

  for (const game of games) {
    const normalized = normalizeSportsDataIoNbaGame({
      game,
      teamsById,
    });

    await upsertSportsEvent(normalized);
    syncedCount += 1;
  }

  return {
    apiSeason: currentSeason.ApiSeason,
    teamCount: teams.length,
    gameCount: games.length,
    syncedCount,
  };
}
