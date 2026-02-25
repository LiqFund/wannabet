"use client";

import React, { useEffect, useMemo, useState } from "react";

type Sector = "Crypto" | "Equities" | "Commodities" | "FX";
type BetType = "Threshold" | "Relative Performance" | "Time-to-Touch";
type Comparator = "Above" | "Below";
type SettlementToken = "USDC" | "SOL" | "USDT";

type Underlying = {
  id: string;
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
};

const BET_TYPES_BY_SECTOR: Record<Sector, BetType[]> = {
  Crypto: ["Threshold", "Time-to-Touch", "Relative Performance"],
  Equities: ["Threshold", "Time-to-Touch", "Relative Performance"],
  Commodities: ["Threshold", "Time-to-Touch"],
  FX: ["Threshold", "Time-to-Touch"],
};

const BET_TYPE_DESC: Record<BetType, string> = {
  Threshold: "Price above or below a level at expiry",
  "Relative Performance": "A outperforms B over a period",
  "Time-to-Touch": "A touches a level before expiry",
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

export default function BetCreatePage() {
  const gold = "#D4AF37";
  const oddsPresets = ["1-1", "2-1", "3-1", "4-1", "5-1", "10-1", "Custom"] as const;

  const [sector, setSector] = useState<Sector>("Crypto");
  const [search, setSearch] = useState("");
  const [betType, setBetType] = useState<BetType>("Threshold");

  const [underlyingA, setUnderlyingA] = useState<string>("BTC/USD");
  const [underlyingB, setUnderlyingB] = useState<string>("ETH/USD");

  const [expiryPreset, setExpiryPreset] = useState<"7D" | "30D" | "90D" | "Custom">("90D");
  const [expiryDate, setExpiryDate] = useState<string>("");

  const [comparatorA, setComparatorA] = useState<Comparator>("Above");
  const [strikeA, setStrikeA] = useState<string>("100000");

  const [stakeAmount, setStakeAmount] = useState<string>("100000");
  const [stakeToken, setStakeToken] = useState<SettlementToken>("USDC");
  const [oddsPreset, setOddsPreset] = useState<(typeof oddsPresets)[number]>("1-1");
  const [oddsX, setOddsX] = useState<string>("2");

  const [title, setTitle] = useState<string>("");

  const allowedBetTypes = useMemo(() => BET_TYPES_BY_SECTOR[sector], [sector]);

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

  const labelById = useMemo(() => {
    const labels = new Map<string, string>();
    Object.values(UNDERLYINGS_BY_SECTOR)
      .flat()
      .forEach((u) => labels.set(u.id, u.label));
    return labels;
  }, []);

  const summary = useMemo(() => {
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
      sector,
      betType,
      expiry,
      condition,
      makerEscrow: `${maker.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${stakeToken}`,
      opponentRequired: `${taker.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${stakeToken}`,
      odds: `${x.toLocaleString(undefined, { maximumFractionDigits: 8 })}-1`,
      title: title.trim() || "Untitled bet",
    };
  }, [betType, comparatorA, expiryDate, expiryPreset, labelById, oddsPreset, oddsX, sector, stakeAmount, stakeToken, strikeA, title, underlyingA, underlyingB]);

  const makerStake = parseAmount(stakeAmount);
  const selectedOddsX = oddsPreset === "Custom" ? parseAmount(oddsX) : parseAmount(oddsPreset.split("-")[0]);
  const safeOddsX = selectedOddsX > 0 ? selectedOddsX : 1;
  const takerStake = makerStake > 0 ? makerStake / safeOddsX : 0;

  const shellStyle: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(900px 560px at 50% 18%, rgba(212,175,55,0.12), rgba(0,0,0,0) 60%), #000",
    color: "white",
  };

  return (
    <div style={shellStyle} className="px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-2">
          <div className="text-xs tracking-wide text-white/55">Wanna Bet? • Create</div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Create a bet</h1>
          <div className="text-sm text-white/60">
            Frontend-only slip. Choose a sector, pick a market, set conditions, then preview the contract.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="flex flex-col gap-6">
            <SectionCard title="Title" subtitle="Start here">
              <div className="flex flex-col gap-4">
                <FieldRow label="Bet title" hint="Name the bet first. If empty, we use a default.">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. BTC above 100k in 90 days" />
                </FieldRow>
              </div>
            </SectionCard>

            <SectionCard title="1) Market" subtitle="Step 1">
              <div className="flex flex-col gap-5">
                <FieldRow
                  label="Sector"
                  hint="This controls which underlyings show up."
                  right={<Pill>Required</Pill>}
                >
                  <Select value={sector} onChange={(e) => setSector(e.target.value as Sector)}>
                    <option value="Crypto">Crypto</option>
                    <option value="Equities">Equities</option>
                    <option value="Commodities">Commodities</option>
                    <option value="FX">FX</option>
                  </Select>
                </FieldRow>

                <FieldRow label="Search underlyings" hint="Filter by ticker or name.">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Try "btc", "spy", "gold", "dxy"...'
                  />
                </FieldRow>

                <FieldRow
                  label="Underlying A"
                  hint="Primary market used in the bet condition."
                  right={<Pill>Required</Pill>}
                >
                  <Select value={underlyingA} onChange={(e) => setUnderlyingA(e.target.value)}>
                    {aOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </Select>
                </FieldRow>
              </div>
            </SectionCard>

            <SectionCard title="2) Bet type" subtitle="Step 2">
              <div className="flex flex-col gap-5">
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
              </div>
            </SectionCard>

            <SectionCard title="3) Parameters" subtitle="Step 3">
              <div className="flex flex-col gap-5">
                {canUseB ? (
                  <FieldRow
                    label="Underlying B"
                    hint="Required for relative performance bets. Must differ from Underlying A."
                    right={<Pill>Required</Pill>}
                  >
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
                    <div className="text-sm text-white/80">
                      Outperformance is based on percent change from start to end of the selected period.
                    </div>
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
                        style={
                          expiryPreset === p
                            ? { borderColor: "rgba(212,175,55,0.55)", background: "rgba(212,175,55,0.10)" }
                            : undefined
                        }
                      >
                        {p === "Custom" ? "Custom" : p}
                      </MiniButton>
                    ))}
                  </div>
                </FieldRow>

                {expiryPreset === "Custom" ? (
                  <FieldRow label="Expiry date" hint="Frontend only. Any date format is accepted.">
                    <div className="space-y-2">
                      <Input
                        type="datetime-local"
                        value={toUtcInputValue(expiryDate)}
                        onChange={(e) => setExpiryDate(fromUtcInputValue(e.target.value))}
                      />
                      <div className="text-xs text-white/55">Stored/displayed as UTC</div>
                    </div>
                  </FieldRow>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="5) Stake" subtitle="Step 5">
              <div className="flex flex-col gap-5">
                <FieldRow label="Your stake (Maker escrow)" hint="Amount you escrow as maker (UI only).">
                  <Input value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} placeholder="e.g. 100000" />
                </FieldRow>

                <FieldRow label="Odds offered" hint="Defines opponent escrow requirement as X-1.">
                  <div className="space-y-3">
                    <Select value={oddsPreset} onChange={(e) => setOddsPreset(e.target.value as (typeof oddsPresets)[number])}>
                      {oddsPresets.map((preset) => (
                        <option key={preset} value={preset}>
                          {preset}
                        </option>
                      ))}
                    </Select>
                    {oddsPreset === "Custom" ? (
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        step="any"
                        value={oddsX}
                        onChange={(e) => setOddsX(e.target.value)}
                        placeholder="Enter X for X-1 odds"
                      />
                    ) : null}
                  </div>
                </FieldRow>

                <FieldRow label="Opponent stake required" hint="Calculated as Maker escrow / X.">
                  <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white/85">
                    {takerStake.toLocaleString(undefined, { maximumFractionDigits: 8 })} {stakeToken}
                  </div>
                </FieldRow>

                <FieldRow label="Settlement token" hint="Token used to denominate the stake (UI only).">
                  <Select value={stakeToken} onChange={(e) => setStakeToken(e.target.value as SettlementToken)}>
                    <option value="USDC">USDC</option>
                    <option value="SOL">SOL</option>
                    <option value="USDT">USDT</option>
                  </Select>
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
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                  UI only
                </div>
              </div>

              <div className="mt-5 space-y-3">
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
              </div>

              <div className="mt-5">
                <button
                  className="w-full rounded-2xl border px-5 py-3 text-sm font-semibold"
                  style={{
                    borderColor: "rgba(212,175,55,0.35)",
                    background: "rgba(212,175,55,0.10)",
                    color: gold,
                  }}
                  onClick={() => {
                    alert("Frontend-only preview. Hook up create/escrow later.");
                  }}
                >
                  Create bet (UI only)
                </button>

                <div className="mt-3 text-xs text-white/45">
                  This button does nothing permanent. It’s only here to show the intended flow.
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
                    setStakeToken("USDC");
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
                    setStakeToken("USDC");
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
                    setStakeToken("USDC");
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
                    setStakeToken("USDC");
                    setTitle("DXY above 106 in 30 days");
                  }}
                >
                  DXY &gt; 106 (30D)
                </MiniButton>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-white/35">
          Bet slip UI only. No wallet, no escrow, no settlement logic included.
        </div>
      </div>
    </div>
  );
}
