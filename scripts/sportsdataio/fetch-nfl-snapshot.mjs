const API_KEY = process.env.SPORTSDATAIO_API_KEY;
const SPORT = (process.argv[2] || "nfl").toLowerCase();

if (!API_KEY) {
  console.error("Missing SPORTSDATAIO_API_KEY");
  process.exit(1);
}

const BASE = `https://api.sportsdata.io/v3/${SPORT}/scores/json`;

async function api(path) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      "Ocp-Apim-Subscription-Key": API_KEY,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SportsDataIO ${res.status}: ${text}`);
  }

  return res.json();
}

function count(value) {
  return Array.isArray(value) ? value.length : null;
}

async function safeApi(path) {
  try {
    return await api(path);
  } catch (err) {
    return { __error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const currentSeason = await safeApi("CurrentSeason");
  const upcomingSeason = await safeApi("UpcomingSeason");
  const currentWeek = await safeApi("CurrentWeek");
  const timeframesCurrent = await safeApi("Timeframes/current");
  const timeframesUpcoming = await safeApi("Timeframes/upcoming");
  const teams = await safeApi("TeamsBasic");

  const schedulesCurrentDefault =
    typeof currentSeason === "number"
      ? await safeApi(`Schedules/${currentSeason}`)
      : { __error: "currentSeason not numeric" };

  const schedulesCurrentReg =
    typeof currentSeason === "number"
      ? await safeApi(`Schedules/${currentSeason}REG`)
      : { __error: "currentSeason not numeric" };

  const schedulesCurrentPre =
    typeof currentSeason === "number"
      ? await safeApi(`Schedules/${currentSeason}PRE`)
      : { __error: "currentSeason not numeric" };

  const schedulesCurrentPost =
    typeof currentSeason === "number"
      ? await safeApi(`Schedules/${currentSeason}POST`)
      : { __error: "currentSeason not numeric" };

  const schedulesUpcomingReg =
    typeof upcomingSeason === "number"
      ? await safeApi(`Schedules/${upcomingSeason}REG`)
      : { __error: "upcomingSeason not numeric" };

  const schedulesUpcomingPre =
    typeof upcomingSeason === "number"
      ? await safeApi(`Schedules/${upcomingSeason}PRE`)
      : { __error: "upcomingSeason not numeric" };

  const schedulesUpcomingPost =
    typeof upcomingSeason === "number"
      ? await safeApi(`Schedules/${upcomingSeason}POST`)
      : { __error: "upcomingSeason not numeric" };

  console.log(
    JSON.stringify(
      {
        sport: SPORT,
        currentSeason,
        upcomingSeason,
        currentWeek,
        teamCount: count(teams),
        timeframeCurrentCount: count(timeframesCurrent),
        timeframeUpcomingCount: count(timeframesUpcoming),

        scheduleCounts: {
          currentDefault: count(schedulesCurrentDefault),
          currentReg: count(schedulesCurrentReg),
          currentPre: count(schedulesCurrentPre),
          currentPost: count(schedulesCurrentPost),
          upcomingReg: count(schedulesUpcomingReg),
          upcomingPre: count(schedulesUpcomingPre),
          upcomingPost: count(schedulesUpcomingPost),
        },

        firstTimeframeCurrent: Array.isArray(timeframesCurrent)
          ? timeframesCurrent[0]
          : timeframesCurrent,
        firstTimeframeUpcoming: Array.isArray(timeframesUpcoming)
          ? timeframesUpcoming[0]
          : timeframesUpcoming,

        firstScheduleCurrentReg: Array.isArray(schedulesCurrentReg)
          ? schedulesCurrentReg[0]
          : schedulesCurrentReg,
        firstScheduleCurrentPre: Array.isArray(schedulesCurrentPre)
          ? schedulesCurrentPre[0]
          : schedulesCurrentPre,
        firstScheduleUpcomingReg: Array.isArray(schedulesUpcomingReg)
          ? schedulesUpcomingReg[0]
          : schedulesUpcomingReg,
        firstScheduleUpcomingPre: Array.isArray(schedulesUpcomingPre)
          ? schedulesUpcomingPre[0]
          : schedulesUpcomingPre,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
