"use client";

import React, { useMemo, useState } from "react";

type Sector = "Crypto" | "Equities" | "Commodities" | "FX" | "Rates" | "Macro" | "Volatility";

type BetType =
  | "Threshold"
  | "Range"
  | "Relative Performance"
  | "Time-to-Touch"
  | "Ratio"
  | "Volatility"
  | "Multi-Condition";

type Comparator = "Above" | "Below";
type SettlementToken = "USDC" | "SOL" | "USDT";

type Underlying = {
  id: string;
  label: string;
  sector: Sector;
  tags?: string[];
};

const UNDERLYINGS: Underlying[] = [
  { id: "BTC/USD", label: "BTC / USD", sector: "Crypto", tags: ["major"] },
  { id: "ETH/USD", label: "ETH / USD", sector: "Crypto", tags: ["major"] },
  { id: "SOL/USD", label: "SOL / USD", sector: "Crypto", tags: ["major"] },
  { id: "BNB/USD", label: "BNB / USD", sector: "Crypto" },
  { id: "XRP/USD", label: "XRP / USD", sector: "Crypto" },

  { id: "SPY", label: "SPY (S&P 500 ETF)", sector: "Equities", tags: ["index"] },
  { id: "QQQ", label: "QQQ (Nasdaq 100 ETF)", sector: "Equities", tags: ["index"] },
  { id: "AAPL", label: "AAPL", sector: "Equities" },
  { id: "NVDA", label: "NVDA", sector: "Equities" },
  { id: "TSLA", label: "TSLA", sector: "Equities" },

  { id: "XAU/USD", label: "Gold (XAU / USD)", sector: "Commodities", tags: ["metal"] },
  { id: "XAG/USD", label: "Silver (XAG / USD)", sector: "Commodities", tags: ["metal"] },
  { id: "WTI", label: "WTI Crude Oil", sector: "Commodities", tags: ["energy"] },
  { id: "BRENT", label: "Brent Crude Oil", sector: "Commodities", tags: ["energy"] },

  { id: "EUR/USD", label: "EUR / USD", sector: "FX" },
  { id: "USD/JPY", label: "USD / JPY", sector: "FX" },
  { id: "GBP/USD", label: "GBP / USD", sector: "FX" },

  { id: "US10Y", label: "US 10Y Yield", sector: "Rates", tags: ["yield"] },
  { id: "US02Y", label: "US 2Y Yield", sector: "Rates", tags: ["yield"] },

  { id: "US_CPI_YOY", label: "US CPI YoY (%)", sector: "Macro", tags: ["release"] },
  { id: "US_GDP_QOQ", label: "US GDP QoQ (%)", sector: "Macro", tags: ["release"] },

  { id: "VIX", label: "VIX Index", sector: "Volatility", tags: ["index"] },
  { id: "BTC_RVOL_30D", label: "BTC Realized Vol (30D)", sector: "Volatility", tags: ["derived"] },
];

const BET_TYPES: { id: BetType; desc: string; needs: ("A" | "B")[] }[] = [
  { id: "Threshold", desc: "Price above or below a level at expiry", needs: ["A"] },
  { id: "Range", desc: "Price between two bounds at expiry", needs: ["A"] },
  { id: "Relative Performance", desc: "A outperforms B over a period", needs: ["A", "B"] },
  { id: "Time-to-Touch", desc: "A touches a level before expiry", needs: ["A"] },
  { id: "Ratio", desc: "A/B ratio above or below a level at expiry", needs: ["A", "B"] },
  { id: "Volatility", desc: "Vol metric above or below a level at expiry", needs: ["A"] },
  { id: "Multi-Condition", desc: "Combine two numeric conditions with AND", needs: ["A", "B"] },
];

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatNumber(x: string) {
  const n = Number(x);
  if (!Number.isFinite(n)) return x;
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
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

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white",
        "outline-none focus:border-white/25"
      )}
    />
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

  const [sector, setSector] = useState<Sector>("Crypto");
  const [search, setSearch] = useState("");
  const [betType, setBetType] = useState<BetType>("Threshold");

  const [underlyingA, setUnderlyingA] = useState<string>("BTC/USD");
  const [underlyingB, setUnderlyingB] = useState<string>("ETH/USD");

  const [expiryPreset, setExpiryPreset] = useState<"7D" | "30D" | "90D" | "Custom">("90D");
  const [expiryDate, setExpiryDate] = useState<string>("");

  const [comparatorA, setComparatorA] = useState<Comparator>("Above");
  const [strikeA, setStrikeA] = useState<string>("100000");

  const [lower, setLower] = useState<string>("90000");
  const [upper, setUpper] = useState<string>("110000");

  const [ratioComparator, setRatioComparator] = useState<Comparator>("Above");
  const [ratioLevel, setRatioLevel] = useState<string>("0.08");

  const [volComparator, setVolComparator] = useState<Comparator>("Above");
  const [volLevel, setVolLevel] = useState<string>("80");

  const [stakeAmount, setStakeAmount] = useState<string>("100000");
  const [stakeToken, setStakeToken] = useState<SettlementToken>("USDC");

  const [title, setTitle] = useState<string>("");

  const needs = useMemo(() => BET_TYPES.find((x) => x.id === betType)?.needs ?? ["A"], [betType]);

  const underlyingsForSector = useMemo(() => {
    const q = search.trim().toLowerCase();
    return UNDERLYINGS.filter((u) => u.sector === sector).filter((u) => {
      if (!q) return true;
      return u.label.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || (u.tags ?? []).some((t) => t.includes(q));
    });
  }, [sector, search]);

  const aOptions = underlyingsForSector;
  const bOptions = useMemo(() => UNDERLYINGS.filter((u) => u.sector === sector), [sector]);

  const canUseB = needs.includes("B");

  const summary = useMemo(() => {
    const A = UNDERLYINGS.find((u) => u.id === underlyingA)?.label ?? underlyingA;
    const B = UNDERLYINGS.find((u) => u.id === underlyingB)?.label ?? underlyingB;

    const expiry =
      expiryPreset === "Custom"
        ? expiryDate || "Custom date"
        : expiryPreset === "7D"
          ? "7 days"
          : expiryPreset === "30D"
            ? "30 days"
            : "90 days";

    let condition = "";

    if (betType === "Threshold") {
      condition = `${A} ${comparatorA === "Above" ? ">" : "<"} ${formatNumber(strikeA)} at expiry`;
    } else if (betType === "Range") {
      condition = `${A} between ${formatNumber(lower)} and ${formatNumber(upper)} at expiry`;
    } else if (betType === "Time-to-Touch") {
      condition = `${A} touches ${formatNumber(strikeA)} before expiry`;
    } else if (betType === "Relative Performance") {
      condition = `${A} outperforms ${B} over ${expiry}`;
    } else if (betType === "Ratio") {
      condition = `${A}/${B} ${ratioComparator === "Above" ? ">" : "<"} ${formatNumber(ratioLevel)} at expiry`;
    } else if (betType === "Volatility") {
      condition = `${A} volatility ${volComparator === "Above" ? ">" : "<"} ${formatNumber(volLevel)} at expiry`;
    } else if (betType === "Multi-Condition") {
      condition = `${A} ${comparatorA === "Above" ? ">" : "<"} ${formatNumber(strikeA)} AND ${B} ${ratioComparator === "Above" ? ">" : "<"} ${formatNumber(ratioLevel)} at expiry`;
    }

    return {
      sector,
      betType,
      expiry,
      condition,
      stake: `${formatNumber(stakeAmount)} ${stakeToken}`,
      title: title.trim() || "Untitled bet",
    };
  }, [
    betType,
    comparatorA,
    expiryDate,
    expiryPreset,
    lower,
    ratioComparator,
    ratioLevel,
    sector,
    stakeAmount,
    stakeToken,
    strikeA,
    title,
    underlyingA,
    underlyingB,
    upper,
    volComparator,
    volLevel,
  ]);

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
                    <option value="Rates">Rates</option>
                    <option value="Macro">Macro</option>
                    <option value="Volatility">Volatility</option>
                  </Select>
                </FieldRow>

                <FieldRow label="Search underlyings" hint="Filter by ticker, name, or tag.">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Try "btc", "index", "yield", "metal"...'
                  />
                </FieldRow>

                <FieldRow
                  label="Underlying A"
                  hint="Primary market used in the bet condition."
                  right={<Pill>{needs.includes("A") ? "Required" : "Optional"}</Pill>}
                >
                  <Select value={underlyingA} onChange={(e) => setUnderlyingA(e.target.value)}>
                    {aOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </Select>
                </FieldRow>

                {canUseB ? (
                  <FieldRow
                    label="Underlying B"
                    hint="Second market used for relative, ratio, or multi-condition bets."
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
              </div>
            </SectionCard>

            <SectionCard title="2) Bet type" subtitle="Step 2">
              <div className="flex flex-col gap-5">
                <FieldRow label="Bet structure" hint="Pick the contract form you want." right={<Pill>Required</Pill>}>
                  <Select value={betType} onChange={(e) => setBetType(e.target.value as BetType)}>
                    {BET_TYPES.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id}
                      </option>
                    ))}
                  </Select>
                </FieldRow>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-medium text-white/85">What this means</div>
                  <div className="mt-1 text-sm text-white/60">
                    {BET_TYPES.find((x) => x.id === betType)?.desc}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="3) Parameters" subtitle="Step 3">
              <div className="flex flex-col gap-5">
                {(betType === "Threshold" || betType === "Time-to-Touch") && (
                  <>
                    <FieldRow label="Direction" hint="Above or below the target.">
                      <Select value={comparatorA} onChange={(e) => setComparatorA(e.target.value as Comparator)}>
                        <option value="Above">Above</option>
                        <option value="Below">Below</option>
                      </Select>
                    </FieldRow>

                    <FieldRow label="Target level" hint="The numeric strike.">
                      <Input value={strikeA} onChange={(e) => setStrikeA(e.target.value)} placeholder="e.g. 100000" />
                    </FieldRow>
                  </>
                )}

                {betType === "Range" && (
                  <>
                    <FieldRow label="Lower bound" hint="Minimum value at expiry.">
                      <Input value={lower} onChange={(e) => setLower(e.target.value)} placeholder="e.g. 90000" />
                    </FieldRow>
                    <FieldRow label="Upper bound" hint="Maximum value at expiry.">
                      <Input value={upper} onChange={(e) => setUpper(e.target.value)} placeholder="e.g. 110000" />
                    </FieldRow>
                  </>
                )}

                {betType === "Ratio" && (
                  <>
                    <FieldRow label="Ratio direction" hint="Compare A/B to a level.">
                      <Select value={ratioComparator} onChange={(e) => setRatioComparator(e.target.value as Comparator)}>
                        <option value="Above">Above</option>
                        <option value="Below">Below</option>
                      </Select>
                    </FieldRow>
                    <FieldRow label="Ratio level" hint="Example: ETH/BTC = 0.08">
                      <Input value={ratioLevel} onChange={(e) => setRatioLevel(e.target.value)} placeholder="e.g. 0.08" />
                    </FieldRow>
                  </>
                )}

                {betType === "Volatility" && (
                  <>
                    <FieldRow label="Vol direction" hint="Above or below the vol threshold.">
                      <Select value={volComparator} onChange={(e) => setVolComparator(e.target.value as Comparator)}>
                        <option value="Above">Above</option>
                        <option value="Below">Below</option>
                      </Select>
                    </FieldRow>
                    <FieldRow label="Vol level" hint="Percent, not decimals. Example: 80 means 80%.">
                      <Input value={volLevel} onChange={(e) => setVolLevel(e.target.value)} placeholder="e.g. 80" />
                    </FieldRow>
                  </>
                )}

                {betType === "Relative Performance" && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm text-white/80">
                      No extra parameters. The outcome is based on performance over the selected period.
                    </div>
                  </div>
                )}

                {betType === "Multi-Condition" && (
                  <>
                    <FieldRow label="Condition A direction" hint="First condition uses Underlying A.">
                      <Select value={comparatorA} onChange={(e) => setComparatorA(e.target.value as Comparator)}>
                        <option value="Above">Above</option>
                        <option value="Below">Below</option>
                      </Select>
                    </FieldRow>
                    <FieldRow label="Condition A level" hint="Strike for Underlying A.">
                      <Input value={strikeA} onChange={(e) => setStrikeA(e.target.value)} placeholder="e.g. 100000" />
                    </FieldRow>

                    <div className="h-px w-full bg-white/10" />

                    <FieldRow label="Condition B direction" hint="Second condition uses Underlying B.">
                      <Select value={ratioComparator} onChange={(e) => setRatioComparator(e.target.value as Comparator)}>
                        <option value="Above">Above</option>
                        <option value="Below">Below</option>
                      </Select>
                    </FieldRow>
                    <FieldRow label="Condition B level" hint="Strike for Underlying B (numeric).">
                      <Input value={ratioLevel} onChange={(e) => setRatioLevel(e.target.value)} placeholder="e.g. 0.08 or 5000" />
                    </FieldRow>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm text-white/75">This bet resolves YES only if both conditions are true.</div>
                    </div>
                  </>
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
                    <Input
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      placeholder="e.g. 2026-06-01 12:00 UTC"
                    />
                  </FieldRow>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="5) Stake" subtitle="Step 5">
              <div className="flex flex-col gap-5">
                <FieldRow label="Stake amount" hint="Amount each side would escrow (UI only).">
                  <Input value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} placeholder="e.g. 100000" />
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

            <SectionCard title="6) Title" subtitle="Optional">
              <div className="flex flex-col gap-4">
                <FieldRow label="Bet title" hint="Used for the listing card. If empty, we use a default.">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. BTC above 100k in 90 days" />
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
                  <div className="text-xs text-white/55">Stake</div>
                  <div className="mt-1 text-sm text-white/85">{summary.stake}</div>
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

              <div className="mt-6 h-px w-full bg-white/10" />

              <div className="mt-5 space-y-2 text-xs text-white/55">
                <div className="flex items-center justify-between">
                  <span>Flow</span>
                  <span className="text-white/70">Sector → Underlyings → Type → Params → Expiry → Stake</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Backend</span>
                  <span className="text-white/70">None</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Oracles</span>
                  <span className="text-white/70">None</span>
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
                    setBetType("Range");
                    setLower("2200");
                    setUpper("2600");
                    setExpiryPreset("90D");
                    setStakeAmount("25000");
                    setStakeToken("USDC");
                    setTitle("Gold between 2200 and 2600 (90D)");
                  }}
                >
                  Gold range bet (90D)
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
