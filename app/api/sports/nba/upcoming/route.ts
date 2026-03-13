import { NextResponse } from "next/server";
import { listUpcomingNbaEvents } from "@/lib/server/sports/repository/listUpcomingNbaEvents";
import type { UpcomingNbaEventsResponse } from "@/lib/sports/upcomingNba";

export async function GET() {
  try {
    const events = await listUpcomingNbaEvents(25);

    const body: UpcomingNbaEventsResponse = {
      events: events.map((event) => ({
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
        status: event.status,
        finalConfirmed: event.finalConfirmed,
      })),
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load upcoming NBA events." },
      { status: 500 }
    );
  }
}
