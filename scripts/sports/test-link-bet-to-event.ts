import { upsertBetSportsEventLink } from "@/lib/server/sports/repository/upsertBetSportsEventLink";
import { listUpcomingNbaEvents } from "@/lib/server/sports/repository/listUpcomingNbaEvents";
import { getBetSportsEventLink } from "@/lib/server/sports/repository/getBetSportsEventLink";

async function main() {
  const events = await listUpcomingNbaEvents(1);
  const event = events[0];

  if (!event) {
    throw new Error("No upcoming NBA events found.");
  }

  const fakeBetPubkey = "TEST_BET_PUBKEY_SPORTS_LINK";

  await upsertBetSportsEventLink({
    betPubkey: fakeBetPubkey,
    event: {
      id: event.id,
      provider: event.provider,
      providerEventId: event.providerEventId,
      sport: "nba",
      league: "NBA",
      awayTeamId: event.awayTeamId,
      homeTeamId: event.homeTeamId,
      awayTeamCode: event.awayTeamCode,
      homeTeamCode: event.homeTeamCode,
      awayTeamName: event.awayTeamName,
      homeTeamName: event.homeTeamName,
      scheduledStartUtc: event.scheduledStartUtc.toISOString(),
      status: String(event.status).toLowerCase(),
      finalConfirmed: event.finalConfirmed,
    },
  });

  const linked = await getBetSportsEventLink(fakeBetPubkey);
  console.log(JSON.stringify(linked, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
