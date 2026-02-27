"use client";

import React, { useEffect, useMemo, useState } from "react";
import { formatUSDC } from "@/lib/format";

type Sector = "Crypto" | "Equities" | "Commodities" | "FX" | "Sports";
type BetType = "Threshold" | "Relative Performance" | "Time-to-Touch";
type Comparator = "Above" | "Below";
type Sport = "Football" | "Basketball" | "Baseball" | "Hockey" | "Soccer" | "MMA" | "Boxing";
type SportsMarket = "Moneyline" | "Spread" | "Total" | "Draw No Bet" | "Method" | "Round";
type TotalSide = "Over" | "Under";

type Underlying = {
  id: string;
  label: string;
};

type SportsEvent = {
  id: string;
  a: string;
  b: string;
  startsAt: string;
  label: string;
};

const UNDERLYINGS_BY_SECTOR: Record<Sector, Underlying[]> = {
  Crypto: [
    { id: "BTC/USD", label: "BTC / USD" },
    { id: "ETH/USD", label: "ETH / USD" },
    { id: "SOL/USD", label: "SOL / USD" },
    { id: "BNB/USD", label: "BNB / USD" },
    { id: "XRP/USD", label: "XRP / USD" },
  ],
  Equities: [
    { id: "SPY", label: "SPY (S&P 500 ETF)" },
    { id: "QQQ", label: "QQQ (Nasdaq 100 ETF)" },
    { id: "AAPL", label: "AAPL" },
    { id: "NVDA", label: "NVDA" },
    { id: "TSLA", label: "TSLA" },
  ],
  Commodities: [
    { id: "XAU/USD", label: "Gold (XAU / USD)" },
    { id: "XAG/USD", label: "Silver (XAG / USD)" },
    { id: "WTI", label: "WTI Crude Oil" },
    { id: "BRENT", label: "Brent Crude Oil" },
  ],
  FX: [{ id: "DXY", label: "DXY" }],
  Sports: [],
};

const BET_TYPES_BY_SECTOR: Record<Sector, BetType[]> = {
  Crypto: ["Threshold", "Time-to-Touch", "Relative Performance"],
  Equities: ["Threshold", "Time-to-Touch", "Relative Performance"],
  Commodities: ["Threshold", "Time-to-Touch"],
  FX: ["Threshold", "Time-to-Touch"],
  Sports: ["Threshold", "Time-to-Touch"],
};

const SPORTS_EVENTS: Record<Sport, SportsEvent[]> = {
  Football: [
    { id: "nfl-1", a: "Chiefs", b: "Ravens", startsAt: "Sun 20:20", label: "NFL: Chiefs vs Ravens (Sun 20:20)" },
    { id: "nfl-2", a: "49ers", b: "Cowboys", startsAt: "Sun 16:25", label: "NFL: 49ers vs Cowboys (Sun 16:25)" },
    { id: "nfl-3", a: "Bills", b: "Dolphins", startsAt: "Mon 20:15", label: "NFL: Bills vs Dolphins (Mon 20:15)" },
    { id: "nfl-4", a: "Bengals", b: "Steelers", startsAt: "Thu 20:15", label: "NFL: Bengals vs Steelers (Thu 20:15)" },
  ],
  Basketball: [
    { id: "nba-1", a: "Lakers", b: "Warriors", startsAt: "Tue 03:00", label: "NBA: Lakers vs Warriors (Tue 03:00)" },
    { id: "nba-2", a: "Celtics", b: "Bucks", startsAt: "Wed 01:30", label: "NBA: Celtics vs Bucks (Wed 01:30)" },
    { id: "nba-3", a: "Nuggets", b: "Suns", startsAt: "Fri 02:00", label: "NBA: Nuggets vs Suns (Fri 02:00)" },
    { id: "nba-4", a: "Knicks", b: "Heat", startsAt: "Sat 00:30", label: "NBA: Knicks vs Heat (Sat 00:30)" },
  ],
  Baseball: [
    { id: "mlb-1", a: "Yankees", b: "Red Sox", startsAt: "Tue 19:10", label: "MLB: Yankees vs Red Sox (Tue 19:10)" },
    { id: "mlb-2", a: "Dodgers", b: "Giants", startsAt: "Wed 22:10", label: "MLB: Dodgers vs Giants (Wed 22:10)" },
    { id: "mlb-3", a: "Astros", b: "Mariners", startsAt: "Thu 20:10", label: "MLB: Astros vs Mariners (Thu 20:10)" },
    { id: "mlb-4", a: "Cubs", b: "Cardinals", startsAt: "Fri 14:20", label: "MLB: Cubs vs Cardinals (Fri 14:20)" },
  ],
  Hockey: [
    { id: "nhl-1", a: "Rangers", b: "Bruins", startsAt: "Tue 19:00", label: "NHL: Rangers vs Bruins (Tue 19:00)" },
    { id: "nhl-2", a: "Oilers", b: "Canucks", startsAt: "Wed 21:30", label: "NHL: Oilers vs Canucks (Wed 21:30)" },
    { id: "nhl-3", a: "Maple Leafs", b: "Canadiens", startsAt: "Thu 19:30", label: "NHL: Maple Leafs vs Canadiens (Thu 19:30)" },
    { id: "nhl-4", a: "Avalanche", b: "Stars", startsAt: "Sat 20:00", label: "NHL: Avalanche vs Stars (Sat 20:00)" },
  ],
  Soccer: [
    { id: "epl-1", a: "Arsenal", b: "Chelsea", startsAt: "Sat 17:30", label: "EPL: Arsenal vs Chelsea (Sat 17:30)" },
    { id: "epl-2", a: "Liverpool", b: "Tottenham", startsAt: "Sun 16:30", label: "EPL: Liverpool vs Tottenham (Sun 16:30)" },
    { id: "epl-3", a: "Man City", b: "Newcastle", startsAt: "Sat 12:30", label: "EPL: Man City vs Newcastle (Sat 12:30)" },
    { id: "epl-4", a: "Man United", b: "Brighton", startsAt: "Sun 14:00", label: "EPL: Man United vs Brighton (Sun 14:00)" },
  ],
  MMA: [
    { id: "ufc-1", a: "Fighter A", b: "Fighter B", startsAt: "Sat 22:00", label: "UFC: Fighter A vs Fighter B (Sat 22:00)" },
    { id: "ufc-2", a: "Fighter C", b: "Fighter D", startsAt: "Sat 21:30", label: "UFC: Fighter C vs Fighter D (Sat 21:30)" },
    { id: "ufc-3", a: "Fighter E", b: "Fighter F", startsAt: "Sat 20:45", label: "UFC: Fighter E vs Fighter F (Sat 20:45)" },
    { id: "ufc-4", a: "Fighter G", b: "Fighter H", startsAt: "Sat 20:00", label: "UFC: Fighter G vs Fighter H (Sat 20:00)" },
  ],
  Boxing: [
    { id: "box-1", a: "Boxer A", b: "Boxer B", startsAt: "Fri 23:00", label: "Boxing: Boxer A vs Boxer B (Fri 23:00)" },
    { id: "box-2", a: "Boxer C", b: "Boxer D", startsAt: "Sat 22:30", label: "Boxing: Boxer C vs Boxer D (Sat 22:30)" },
    { id: "box-3", a: "Boxer E", b: "Boxer F", startsAt: "Sat 21:45", label: "Boxing: Boxer E vs Boxer F (Sat 21:45)" },
    { id: "box-4", a: "Boxer G", b: "Boxer H", startsAt: "Sun 00:15", label: "Boxing: Boxer G vs Boxer H (Sun 00:15)" },
  ],
};

const SPORT_MARKET_MATRIX: Record<
  Sport,
  {
    markets: SportsMarket[];
    allowDraw: boolean;
    spread?: boolean;
    totalUnit: string;
    roundsMax?: number;
    allowSubmission?: boolean;
  }
> = {
  Football: { markets: ["Moneyline", "Spread", "Total"], allowDraw: false, spread: true, totalUnit: "points" },
  Basketball: { markets: ["Moneyline", "Spread", "Total"], allowDraw: false, spread: true, totalUnit: "points" },
  Hockey: { markets: ["Moneyline", "Spread", "Total"], allowDraw: false, spread: true, totalUnit: "points" },
  Baseball: { markets: ["Moneyline", "Total"], allowDraw: false, totalUnit: "runs" },
  Soccer: { markets: ["Moneyline", "Total", "Draw No Bet"], allowDraw: true, totalUnit: "goals" },
  MMA: { markets: ["Moneyline", "Method", "Round"], allowDraw: true, totalUnit: "rounds", roundsMax: 5, allowSubmission: true },
  Boxing: {
    markets: ["Moneyline", "Method", "Round"],
    allowDraw: true,
    totalUnit: "rounds",
    roundsMax: 12,
    allowSubmission: false,
  },
};

const SECTOR_OPTIONS: Sector[] = ["Crypto", "Equities", "Commodities", "FX", "Sports"];

const BET_TYPE_DESC: Record<BetType, string> = {
  Threshold: "Price above or below a level at expiry",
  "Relative Performance": "A outperforms B over a period",
  "Time-to-Touch": "A touches a level before expiry",
};

const SPORTS_MARKET_DESC: Record<SportsMarket, string> = {
  Moneyline: "Pick the outright winner of the event.",
  Spread: "Pick the winner after applying the handicap spread.",
  Total: "Pick whether combined scoring lands over or under a total line.",
  "Draw No Bet": "Pick a side; if the match ends in a draw, this is treated as a refund (UI only).",
  Method: "Pick the winner and method of victory.",
  Round: "Pick the winner and the exact round they win in.",
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatNumber(x: string) {
  const n = Number(x);
  if (!Number.isFinite(n)) return x;
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function parseAmount(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function SectionCard(props: { title: string; subtitle?: string; children: React.ReactNode }) {
  const gold = "#D4AF37";
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 md:p-6">
      <div className="mb-4">
        <div className="text-sm tracking-wide" style={{ color: "rgba(212,175,55,0.9)" }}>
          {props.subtitle ?? ""}
        </div>
        <h2 className="mt-1 text-lg font-semibold text-white">{props.title}</h2>
        <div className="mt-3 h-px w-full" style={{ background: `linear-gradient(90deg, ${gold}, rgba(255,255,255,0))` }} />
      </div>
      {props.children}
    </div>
  );
}

function FieldRow(props: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[240px_1fr] md:gap-6">
      <div className="pt-2">
        <div className="text-sm font-medium text-white/90">{props.label}</div>
        {props.hint ? <div className="mt-1 text-xs text-white/55">{props.hint}</div> : null}
      </div>
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">{props.children}</div>
          {props.right ? <div className="shrink-0">{props.right}</div> : null}
        </div>
      </div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white",
        "placeholder:text-white/35 outline-none focus:border-white/25"
      )}
    />
  );
}

function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={clsx(
          "w-full appearance-none rounded-xl border border-white/10 bg-black/60 px-4 py-3 pr-11 text-sm text-white",
          "outline-none focus:border-white/25",
          className
        )}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/50" aria-hidden>
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 7.75L10 12.25L14.5 7.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

function Pill(props: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">{props.children}</span>;
}

function MiniButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80",
        "hover:border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
      )}
    />
  );
}

function SectorTabs(props: { value: Sector; onChange: (value: Sector) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SECTOR_OPTIONS.map((option) => {
        const isActive = props.value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => props.onChange(option)}
            className={clsx(
              "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-[rgba(212,175,55,0.55)] bg-[rgba(212,175,55,0.10)] text-white"
                : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export default function BetCreatePage() {
  const gold = "#D4AF37";
  const oddsPresets = ["1-1", "2-1", "3-1", "4-1", "5-1", "10-1", "Custom"] as const;

  const [sector, setSector] = useState<Sector>("Crypto");
  const [search, setSearch] = useState("");
  const [betType, setBetType] = useState<BetType>("Threshold");

  const [underlyingA, setUnderlyingA] = useState<string>("BTC/USD");
  const [underlyingB, setUnderlyingB] = useState<string>("ETH/USD");

  const [sport, setSport] = useState<Sport>("MMA");
  const [eventId, setEventId] = useState<string>("");
  const [sportsMarket, setSportsMarket] = useState<SportsMarket>("Moneyline");
  const [pick, setPick] = useState<string>("");
  const [totalLine, setTotalLine] = useState<string>("");
  const [totalSide, setTotalSide] = useState<TotalSide>("Over");
  const [spreadLine, setSpreadLine] = useState<string>("");
  const [methodPick, setMethodPick] = useState<"KO/TKO" | "Submission" | "Decision" | "Draw">("KO/TKO");
  const [roundPick, setRoundPick] = useState<string>("1");

  const [expiryPreset, setExpiryPreset] = useState<"7D" | "30D" | "90D" | "Custom">("90D");
  const [expiryDate, setExpiryDate] = useState<string>("");

  const [comparatorA, setComparatorA] = useState<Comparator>("Above");
  const [strikeA, setStrikeA] = useState<string>("100000");

  const [stakeAmount, setStakeAmount] = useState<string>("100000");
  const [oddsPreset, setOddsPreset] = useState<(typeof oddsPresets)[number]>("1-1");
  const [oddsX, setOddsX] = useState<string>("2");

  const [title, setTitle] = useState<string>("");
  const [isPrivate, setIsPrivate] = useState<boolean>(false);

  const allowedBetTypes = useMemo(() => BET_TYPES_BY_SECTOR[sector], [sector]);
  const activeSportMarkets = useMemo(() => SPORT_MARKET_MATRIX[sport], [sport]);
  const sportEvents = useMemo(() => SPORTS_EVENTS[sport], [sport]);

  const toUtcInputValue = (iso: string) => (iso ? iso.slice(0, 16) : "");
  const fromUtcInputValue = (value: string) => (value ? new Date(`${value}:00Z`).toISOString() : "");
  const formatUtcLabel = (iso: string) => {
    if (!iso) return "Custom date";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Custom date";
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} ${String(
      d.getUTCHours()
    ).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
  };

  const underlyingsForSector = useMemo(() => {
    const q = search.trim().toLowerCase();
    return UNDERLYINGS_BY_SECTOR[sector].filter((u) => {
      if (!q) return true;
      return u.label.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
    });
  }, [search, sector]);

  const aOptions = underlyingsForSector;
  const bOptions = useMemo(() => UNDERLYINGS_BY_SECTOR[sector].filter((u) => u.id !== underlyingA), [sector, underlyingA]);
  const canUseB = betType === "Relative Performance";

  useEffect(() => {
    if (!allowedBetTypes.includes(betType)) {
      setBetType(allowedBetTypes[0]);
    }
  }, [allowedBetTypes, betType]);

  useEffect(() => {
    const sectorUnderlyings = UNDERLYINGS_BY_SECTOR[sector];
    if (!sectorUnderlyings.some((u) => u.id === underlyingA)) {
      setUnderlyingA(sectorUnderlyings[0]?.id ?? "");
    }
  }, [sector, underlyingA]);

  useEffect(() => {
    if (betType !== "Relative Performance") return;
    const sectorUnderlyings = UNDERLYINGS_BY_SECTOR[sector];
    const fallbackB = sectorUnderlyings.find((u) => u.id !== underlyingA)?.id ?? "";
    if (!fallbackB) {
      setUnderlyingB("");
      return;
    }
    if (underlyingB === underlyingA || !sectorUnderlyings.some((u) => u.id === underlyingB)) {
      setUnderlyingB(fallbackB);
    }
  }, [betType, sector, underlyingA, underlyingB]);

  useEffect(() => {
    setEventId("");
    setSportsMarket(SPORT_MARKET_MATRIX[sport].markets[0]);
    setPick("");
    setTotalLine("");
    setSpreadLine("");
    setMethodPick("KO/TKO");
    setRoundPick("1");
    setTotalSide("Over");
  }, [sport]);

  useEffect(() => {
    if (!activeSportMarkets.markets.includes(sportsMarket)) {
      setSportsMarket(activeSportMarkets.markets[0]);
    }
  }, [activeSportMarkets, sportsMarket]);

  const labelById = useMemo(() => {
    const labels = new Map<string, string>();
    Object.values(UNDERLYINGS_BY_SECTOR)
      .flat()
      .forEach((u) => labels.set(u.id, u.label));
    return labels;
  }, []);

  const selectedEvent = useMemo(() => sportEvents.find((event) => event.id === eventId) ?? null, [sportEvents, eventId]);

  const summary = useMemo(() => {
    if (sector === "Sports") {
      const eventLabel = selectedEvent ? `${selectedEvent.a} vs ${selectedEvent.b} (${selectedEvent.startsAt})` : "No event selected";
      let sportsCondition = "";

      if (sportsMarket === "Moneyline") {
        sportsCondition = `Winner: ${pick || "Not selected"}`;
      } else if (sportsMarket === "Total") {
        sportsCondition = `${totalSide} ${totalLine || "?"} ${activeSportMarkets.totalUnit}`;
      } else if (sportsMarket === "Spread") {
        sportsCondition = `${pick || "Pick side"} ${spreadLine || "?"}`;
      } else if (sportsMarket === "Draw No Bet") {
        sportsCondition = `Draw No Bet: ${pick || "Not selected"}`;
      } else if (sportsMarket === "Method") {
        sportsCondition = `${pick || "Pick fighter"} by ${methodPick}`;
      } else if (sportsMarket === "Round") {
        sportsCondition = `${pick || "Pick fighter"} in round ${roundPick}`;
      }

      const maker = parseAmount(stakeAmount);
      const rawX = oddsPreset === "Custom" ? parseAmount(oddsX) : parseAmount(oddsPreset.split("-")[0]);
      const x = rawX > 0 ? rawX : 1;
      const taker = maker > 0 ? maker / x : 0;

      return {
        mode: "sports" as const,
        title: title.trim() || "Untitled bet",
        visibility: isPrivate ? "Private" : "Public",
        sport,
        event: eventLabel,
        market: sportsMarket,
        condition: sportsCondition,
        resolution: "Resolves at final result",
        makerEscrow: formatUSDC(maker),
        opponentRequired: formatUSDC(taker),
        odds: `${x.toLocaleString(undefined, { maximumFractionDigits: 8 })}-1`,
      };
    }

    const A = labelById.get(underlyingA) ?? underlyingA;
    const B = labelById.get(underlyingB) ?? underlyingB;

    const expiry =
      expiryPreset === "Custom"
        ? formatUtcLabel(expiryDate)
        : expiryPreset === "7D"
          ? "7 days"
          : expiryPreset === "30D"
            ? "30 days"
            : "90 days";

    let condition = "";

    if (betType === "Threshold") {
      condition = `${A} ${comparatorA === "Above" ? ">" : "<"} ${formatNumber(strikeA)} at expiry`;
    } else if (betType === "Time-to-Touch") {
      condition = `${A} touches ${formatNumber(strikeA)} before expiry`;
    } else if (betType === "Relative Performance") {
      condition = `${A} outperforms ${B} over ${expiry}`;
    }

    const maker = parseAmount(stakeAmount);
    const rawX = oddsPreset === "Custom" ? parseAmount(oddsX) : parseAmount(oddsPreset.split("-")[0]);
    const x = rawX > 0 ? rawX : 1;
    const taker = maker > 0 ? maker / x : 0;

    return {
      mode: "financial" as const,
      sector,
      betType,
      expiry,
      condition,
      makerEscrow: formatUSDC(maker),
      opponentRequired: formatUSDC(taker),
      odds: `${x.toLocaleString(undefined, { maximumFractionDigits: 8 })}-1`,
      title: title.trim() || "Untitled bet",
      visibility: isPrivate ? "Private" : "Public",
    };
  }, [
    activeSportMarkets.totalUnit,
    betType,
    comparatorA,
    expiryDate,
    expiryPreset,
    labelById,
    isPrivate,
    methodPick,
    oddsPreset,
    oddsX,
    pick,
    roundPick,
    sector,
    selectedEvent,
    sport,
    sportsMarket,
    spreadLine,
    stakeAmount,
    strikeA,
    title,
    totalLine,
    totalSide,
    underlyingA,
    underlyingB,
  ]);

  const makerStake = parseAmount(stakeAmount);
  const selectedOddsX = oddsPreset === "Custom" ? parseAmount(oddsX) : parseAmount(oddsPreset.split("-")[0]);
  const safeOddsX = selectedOddsX > 0 ? selectedOddsX : 1;
  const takerStake = makerStake > 0 ? makerStake / safeOddsX : 0;

  const isSports = sector === "Sports";
  const moneylinePickOptions = useMemo(() => {
    const options: string[] = [];
    if (selectedEvent) {
      options.push(selectedEvent.a, selectedEvent.b);
      if (activeSportMarkets.allowDraw) {
        options.push("Draw");
      }
    }
    return options;
  }, [activeSportMarkets.allowDraw, selectedEvent]);

  const methodOptions = useMemo(() => {
    if (!activeSportMarkets.allowSubmission) {
      return ["KO/TKO", "Decision", "Draw"] as const;
    }
    return ["KO/TKO", "Submission", "Decision", "Draw"] as const;
  }, [activeSportMarkets.allowSubmission]);

  useEffect(() => {
    if (!moneylinePickOptions.includes(pick)) {
      setPick("");
    }
  }, [moneylinePickOptions, pick]);

  const sportsMissingItems = useMemo(() => {
    if (!isSports) return [] as string[];
    const missing: string[] = [];
    if (!eventId) missing.push("select an event");
    if (["Moneyline", "Spread", "Draw No Bet", "Method", "Round"].includes(sportsMarket) && !pick) {
      missing.push("choose a pick");
    }
    if (sportsMarket === "Total" && !totalLine.trim()) missing.push("enter total line");
    if (sportsMarket === "Spread" && !spreadLine.trim()) missing.push("enter spread line");
    return missing;
  }, [eventId, isSports, pick, spreadLine, sportsMarket, totalLine]);

  const createDisabled = isSports ? sportsMissingItems.length > 0 : false;

  const shellStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "radial-gradient(900px 560px at 50% 18%, rgba(212,175,55,0.12), rgba(0,0,0,0) 60%), #000",
    color: "white",
  };

  return (
    <div style={shellStyle} className="px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-2">
          <div className="text-xs tracking-wide text-white/55">Wanna Bet?</div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Create a bet</h1>
          <div className="text-sm text-white/60">Choose a sector, pick a market, set conditions, then preview the bet.</div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="flex flex-col gap-6">
            <SectionCard title="Title" subtitle="Start here">
              <div className="flex flex-col gap-4">
                <FieldRow label="Bet title" hint="Name the bet first. If empty, we use a default.">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. BTC above 100k in 90 days" />
                </FieldRow>

                <FieldRow
                  label="Private bet"
                  hint="Only people with the link can view and accept this bet."
                  right={
                    isPrivate ? (
                      <span className="rounded-full border border-[rgba(212,175,55,0.35)] bg-[rgba(212,175,55,0.10)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.15em] text-[rgba(212,175,55,0.95)]">
                        PRIVATE
                      </span>
                    ) : null
                  }
                >
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPrivate}
                      onClick={() => setIsPrivate((value) => !value)}
                      className={clsx(
                        "relative inline-flex h-7 w-12 items-center rounded-full border transition-colors",
                        isPrivate
                          ? "border-[rgba(212,175,55,0.5)] bg-[rgba(212,175,55,0.20)]"
                          : "border-white/15 bg-white/10 hover:border-white/25"
                      )}
                    >
                      <span
                        className={clsx(
                          "mx-1 h-5 w-5 rounded-full transition-transform",
                          isPrivate ? "translate-x-5 bg-[rgba(212,175,55,0.95)]" : "translate-x-0 bg-white/80"
                        )}
                      />
                    </button>

                    {isPrivate ? (
                      <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                        <div className="text-xs font-medium text-white/70">Private link</div>
                        <div className="mt-1 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white/45">
                          Will be generated after bet is created
                        </div>
                      </div>
                    ) : null}
                  </div>
                </FieldRow>
              </div>
            </SectionCard>

            <SectionCard title="1) Market" subtitle="Step 1">
              <div className="flex flex-col gap-5">
                <FieldRow label="Sector" hint="This controls which underlyings show up." right={<Pill>Required</Pill>}>
                  <SectorTabs value={sector} onChange={setSector} />
                </FieldRow>

                {isSports ? (
                  <>
                    <FieldRow label="Sport" hint="Choose a sport first." right={<Pill>Required</Pill>}>
                      <Select value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
                        {(Object.keys(SPORTS_EVENTS) as Sport[]).map((sportOption) => (
                          <option key={sportOption} value={sportOption}>
                            {sportOption}
                          </option>
                        ))}
                      </Select>
                    </FieldRow>
                    <FieldRow label="Event / Game" hint="Pick a matchup from mock data." right={<Pill>Required</Pill>}>
                      <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
                        <option value="">Select an event</option>
                        {sportEvents.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.label}
                          </option>
                        ))}
                      </Select>
                    </FieldRow>
                  </>
                ) : (
                  <>
                    <FieldRow label="Search underlyings" hint="Filter by ticker or name.">
                      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Try "btc", "spy", "gold", "dxy"...' />
                    </FieldRow>

                    <FieldRow label="Underlying A" hint="Primary market used in the bet condition." right={<Pill>Required</Pill>}>
                      <Select value={underlyingA} onChange={(e) => setUnderlyingA(e.target.value)}>
                        {aOptions.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.label}
                          </option>
                        ))}
                      </Select>
                    </FieldRow>
                  </>
                )}
              </div>
            </SectionCard>

            <SectionCard title={isSports ? "2) Bet market" : "2) Bet type"} subtitle="Step 2">
              <div className="flex flex-col gap-5">
                {isSports ? (
                  <>
                    <FieldRow label="Market" hint="Available markets depend on sport." right={<Pill>Required</Pill>}>
                      <Select value={sportsMarket} onChange={(e) => setSportsMarket(e.target.value as SportsMarket)}>
                        {activeSportMarkets.markets.map((market) => (
                          <option key={market} value={market}>
                            {market}
                          </option>
                        ))}
                      </Select>
                    </FieldRow>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-medium text-white/85">What this means</div>
                      <div className="mt-1 text-sm text-white/60">{SPORTS_MARKET_DESC[sportsMarket]}</div>
                    </div>

                    {sportsMarket === "Moneyline" ? (
                      <FieldRow label="Pick / Outcome" hint="Choose the winner." right={<Pill>Required</Pill>}>
                        <Select value={pick} onChange={(e) => setPick(e.target.value)} disabled={!selectedEvent}>
                          <option value="">Select an outcome</option>
                          {moneylinePickOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      </FieldRow>
                    ) : null}

                    {sportsMarket === "Total" ? (
                      <>
                        <FieldRow label="Total side" hint="Choose over or under." right={<Pill>Required</Pill>}>
                          <Select value={totalSide} onChange={(e) => setTotalSide(e.target.value as TotalSide)}>
                            <option value="Over">Over</option>
                            <option value="Under">Under</option>
                          </Select>
                        </FieldRow>

                        <FieldRow label={`Total ${activeSportMarkets.totalUnit} line`} hint="Set the total line value." right={<Pill>Required</Pill>}>
                          <Input value={totalLine} onChange={(e) => setTotalLine(e.target.value)} placeholder={`e.g. 2.5 ${activeSportMarkets.totalUnit}`} />
                        </FieldRow>
                      </>
                    ) : null}

                    {sportsMarket === "Spread" ? (
                      <>
                        <FieldRow label="Pick / Outcome" hint="Pick the side against the spread." right={<Pill>Required</Pill>}>
                          <Select value={pick} onChange={(e) => setPick(e.target.value)} disabled={!selectedEvent}>
                            <option value="">Select a side</option>
                            {selectedEvent ? (
                              <>
                                <option value={selectedEvent.a}>{selectedEvent.a}</option>
                                <option value={selectedEvent.b}>{selectedEvent.b}</option>
                              </>
                            ) : null}
                          </Select>
                        </FieldRow>

                        <FieldRow label="Spread line" hint="Pick the side against the spread." right={<Pill>Required</Pill>}>
                          <Input value={spreadLine} onChange={(e) => setSpreadLine(e.target.value)} placeholder="e.g. -3.5" />
                        </FieldRow>
                      </>
                    ) : null}

                    {sportsMarket === "Draw No Bet" ? (
                      <>
                        <FieldRow label="Pick / Outcome" hint="Draw refunds (UI only)." right={<Pill>Required</Pill>}>
                          <Select value={pick} onChange={(e) => setPick(e.target.value)} disabled={!selectedEvent}>
                            <option value="">Select a side</option>
                            {selectedEvent ? (
                              <>
                                <option value={selectedEvent.a}>{selectedEvent.a}</option>
                                <option value={selectedEvent.b}>{selectedEvent.b}</option>
                              </>
                            ) : null}
                          </Select>
                        </FieldRow>

                        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">Draw refunds (UI only).</div>
                      </>
                    ) : null}

                    {sportsMarket === "Method" ? (
                      <>
                        <FieldRow label="Pick winner" hint="Choose who wins first." right={<Pill>Required</Pill>}>
                          <Select value={pick} onChange={(e) => setPick(e.target.value)} disabled={!selectedEvent}>
                            <option value="">Select winner</option>
                            {selectedEvent ? (
                              <>
                                <option value={selectedEvent.a}>{selectedEvent.a}</option>
                                <option value={selectedEvent.b}>{selectedEvent.b}</option>
                              </>
                            ) : null}
                          </Select>
                        </FieldRow>

                        <FieldRow label="Method" hint="How the winner gets it done." right={<Pill>Required</Pill>}>
                          <Select value={methodPick} onChange={(e) => setMethodPick(e.target.value as typeof methodPick)}>
                            {methodOptions.map((method) => (
                              <option key={method} value={method}>
                                {method}
                              </option>
                            ))}
                          </Select>
                        </FieldRow>
                      </>
                    ) : null}

                    {sportsMarket === "Round" ? (
                      <>
                        <FieldRow label="Pick winner" hint="Choose who wins first." right={<Pill>Required</Pill>}>
                          <Select value={pick} onChange={(e) => setPick(e.target.value)} disabled={!selectedEvent}>
                            <option value="">Select winner</option>
                            {selectedEvent ? (
                              <>
                                <option value={selectedEvent.a}>{selectedEvent.a}</option>
                                <option value={selectedEvent.b}>{selectedEvent.b}</option>
                              </>
                            ) : null}
                          </Select>
                        </FieldRow>

                        <FieldRow label="Winning round" hint="Wins in that round (UI only)." right={<Pill>Required</Pill>}>
                          <Select value={roundPick} onChange={(e) => setRoundPick(e.target.value)}>
                            {Array.from({ length: activeSportMarkets.roundsMax ?? 1 }, (_, i) => String(i + 1)).map((round) => (
                              <option key={round} value={round}>
                                Round {round}
                              </option>
                            ))}
                          </Select>
                        </FieldRow>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <FieldRow label="Bet structure" hint="Pick the contract form you want." right={<Pill>Required</Pill>}>
                      <Select value={betType} onChange={(e) => setBetType(e.target.value as BetType)}>
                        {allowedBetTypes.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </Select>
                    </FieldRow>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-medium text-white/85">What this means</div>
                      <div className="mt-1 text-sm text-white/60">{BET_TYPE_DESC[betType]}</div>
                    </div>
                  </>
                )}
              </div>
            </SectionCard>

            {isSports ? (
              <SectionCard title="3) Notes" subtitle="Step 3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  No live updates. Bets resolve once final result is known. UI only.
                </div>
              </SectionCard>
            ) : (
              <>
                <SectionCard title="3) Parameters" subtitle="Step 3">
                  <div className="flex flex-col gap-5">
                    {canUseB ? (
                      <FieldRow label="Underlying B" hint="Required for relative performance bets. Must differ from Underlying A." right={<Pill>Required</Pill>}>
                        <Select value={underlyingB} onChange={(e) => setUnderlyingB(e.target.value)}>
                          {bOptions.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.label}
                            </option>
                          ))}
                        </Select>
                      </FieldRow>
                    ) : null}

                    {betType === "Threshold" && (
                      <>
                        <FieldRow label="Direction" hint="Above or below the target.">
                          <Select value={comparatorA} onChange={(e) => setComparatorA(e.target.value as Comparator)}>
                            <option value="Above">Above</option>
                            <option value="Below">Below</option>
                          </Select>
                        </FieldRow>
                        <FieldRow label="Strike level" hint="Numeric level evaluated at expiry.">
                          <Input value={strikeA} onChange={(e) => setStrikeA(e.target.value)} placeholder="e.g. 100000" />
                        </FieldRow>
                      </>
                    )}

                    {betType === "Time-to-Touch" && (
                      <FieldRow label="Touch level" hint="Any touch before expiry resolves YES.">
                        <Input value={strikeA} onChange={(e) => setStrikeA(e.target.value)} placeholder="e.g. 100000" />
                      </FieldRow>
                    )}

                    {betType === "Relative Performance" && (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="text-sm text-white/80">Outperformance is based on percent change from start to end of the selected period.</div>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="4) Timing" subtitle="Step 4">
                  <div className="flex flex-col gap-5">
                    <FieldRow label="Expiry preset" hint="Preset keeps your slip evergreen.">
                      <div className="flex flex-wrap gap-2">
                        {(["7D", "30D", "90D", "Custom"] as const).map((p) => (
                          <MiniButton
                            key={p}
                            onClick={() => setExpiryPreset(p)}
                            aria-pressed={expiryPreset === p}
                            style={expiryPreset === p ? { borderColor: "rgba(212,175,55,0.55)", background: "rgba(212,175,55,0.10)" } : undefined}
                          >
                            {p === "Custom" ? "Custom" : p}
                          </MiniButton>
                        ))}
                      </div>
                    </FieldRow>

                    {expiryPreset === "Custom" ? (
                      <FieldRow label="Expiry date" hint="Frontend only. Any date format is accepted.">
                        <div className="space-y-2">
                          <Input type="datetime-local" value={toUtcInputValue(expiryDate)} onChange={(e) => setExpiryDate(fromUtcInputValue(e.target.value))} />
                          <div className="text-xs text-white/55">Stored/displayed as UTC</div>
                        </div>
                      </FieldRow>
                    ) : null}
                  </div>
                </SectionCard>
              </>
            )}

            <SectionCard title={isSports ? "4) Stake" : "5) Stake"} subtitle={isSports ? "Step 4" : "Step 5"}>
              <div className="flex flex-col gap-5">
                <FieldRow label="Stake (USDC)" hint="Amount you escrow as maker (UI only).">
                  <Input value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} placeholder="e.g. 100000" />
                </FieldRow>

                <FieldRow label="Odds offered" hint="Defines opponent escrow requirement as X-1.">
                  <div className="space-y-3">
                    <Select value={oddsPreset} onChange={(e) => setOddsPreset(e.target.value as (typeof oddsPresets)[number])}>
                      {oddsPresets.map((preset) => (
                        <option key={preset} value={preset}>
                          {preset === "Custom" ? "Custom" : preset}
                        </option>
                      ))}
                    </Select>

                    {oddsPreset === "Custom" ? (
                      <Input type="number" min={1} max={100} step="any" value={oddsX} onChange={(e) => setOddsX(e.target.value)} placeholder="Enter X for X-1 odds" />
                    ) : null}
                  </div>
                </FieldRow>

                <FieldRow label="Opponent stake required" hint="Calculated as Maker escrow / X.">
                  <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white/85">
                    {formatUSDC(takerStake)}
                  </div>
                </FieldRow>

              </div>
            </SectionCard>
          </div>

          <div className="lg:sticky lg:top-6">
            <div className="rounded-2xl border border-white/10 bg-black/50 p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs tracking-wide text-white/55">Preview</div>
                  <div className="mt-1 text-lg font-semibold text-white">{summary.title}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">UI only</div>
              </div>

              <div className="mt-5 space-y-3">
                {summary.mode === "sports" ? (
                  <>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/55">Sport</div>
                      <div className="mt-1 text-sm text-white/85">{summary.sport}</div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/55">Event</div>
                      <div className="mt-1 text-sm text-white/85">{summary.event}</div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/55">Market</div>
                      <div className="mt-1 text-sm text-white/85">{summary.market}</div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/55">Pick / Condition</div>
                      <div className="mt-1 text-sm text-white/85">{summary.condition}</div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/55">Resolution</div>
                      <div className="mt-1 text-sm text-white/85">{summary.resolution}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/55">Sector</div>
                      <div className="mt-1 text-sm text-white/85">{summary.sector}</div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/55">Type</div>
                      <div className="mt-1 text-sm text-white/85">{summary.betType}</div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/55">Condition</div>
                      <div className="mt-1 text-sm text-white/85">{summary.condition}</div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/55">Expiry</div>
                      <div className="mt-1 text-sm text-white/85">{summary.expiry}</div>
                    </div>
                  </>
                )}

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/55">Maker escrow</div>
                  <div className="mt-1 text-sm text-white/85">{summary.makerEscrow}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/55">Opponent required</div>
                  <div className="mt-1 text-sm text-white/85">{summary.opponentRequired}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/55">Odds</div>
                  <div className="mt-1 text-sm text-white/85">{summary.odds}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/55">Visibility</div>
                  <div className="mt-1 text-sm text-white/85">{summary.visibility}</div>
                </div>
              </div>

              <div className="mt-5">
                <button
                  className="w-full rounded-2xl border px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    borderColor: "rgba(212,175,55,0.35)",
                    background: "rgba(212,175,55,0.10)",
                    color: gold,
                  }}
                  disabled={createDisabled}
                  onClick={() => {
                    alert("Frontend-only preview. Hook up create/escrow later.");
                  }}
                >
                  Create bet
                </button>

                <div className="mt-3 text-xs text-white/45">
                  {isSports && sportsMissingItems.length > 0
                    ? `Missing: ${sportsMissingItems.join(", ")}.`
                    : ""}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5 md:p-6">
              <div className="text-sm font-semibold text-white">Quick presets</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <MiniButton
                  onClick={() => {
                    setSector("Crypto");
                    setSearch("");
                    setUnderlyingA("BTC/USD");
                    setBetType("Threshold");
                    setComparatorA("Above");
                    setStrikeA("100000");
                    setExpiryPreset("90D");
                    setStakeAmount("100000");
                    setTitle("BTC above 100k in 90 days");
                  }}
                >
                  BTC &gt; 100k (90D)
                </MiniButton>

                <MiniButton
                  onClick={() => {
                    setSector("Equities");
                    setSearch("");
                    setUnderlyingA("SPY");
                    setUnderlyingB("QQQ");
                    setBetType("Relative Performance");
                    setExpiryPreset("90D");
                    setStakeAmount("50000");
                    setTitle("SPY outperforms QQQ (90D)");
                  }}
                >
                  SPY outperforms QQQ (90D)
                </MiniButton>

                <MiniButton
                  onClick={() => {
                    setSector("Commodities");
                    setSearch("");
                    setUnderlyingA("XAU/USD");
                    setBetType("Time-to-Touch");
                    setStrikeA("2600");
                    setExpiryPreset("90D");
                    setStakeAmount("25000");
                    setTitle("Gold touches 2600 before expiry (90D)");
                  }}
                >
                  Gold touches 2600 (90D)
                </MiniButton>

                <MiniButton
                  onClick={() => {
                    setSector("FX");
                    setSearch("");
                    setUnderlyingA("DXY");
                    setBetType("Threshold");
                    setComparatorA("Above");
                    setStrikeA("106");
                    setExpiryPreset("30D");
                    setStakeAmount("50000");
                    setTitle("DXY above 106 in 30 days");
                  }}
                >
                  DXY &gt; 106 (30D)
                </MiniButton>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-white/35"></div>
      </div>
    </div>
  );
}
