import { NextResponse } from "next/server";
import { upsertBetSportsEventLink } from "@/lib/server/sports/repository/upsertBetSportsEventLink";
import type { UpcomingNbaEvent } from "@/lib/sports/upcomingNba";

type LinkBetSportsEventRequest = {
  betPubkey: string;
  event: UpcomingNbaEvent;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LinkBetSportsEventRequest;

    if (!body?.betPubkey || !body?.event) {
      return NextResponse.json(
        { error: "Missing betPubkey or event." },
        { status: 400 }
      );
    }

    await upsertBetSportsEventLink({
      betPubkey: body.betPubkey,
      event: body.event,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to link bet to sports event." },
      { status: 500 }
    );
  }
}
