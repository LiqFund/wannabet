"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BN } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getWannaBetProgram } from "@/lib/anchor";
import { formatUSDC } from "@/lib/format";
import {
  WANNABET_DEVNET_TEST_MINT,
  WANNABET_ESCROW_PROGRAM_ID,
} from "@/lib/solana";
import type { UpcomingNbaEvent, UpcomingNbaEventsResponse } from "@/lib/sports/upcomingNba";

type CreateMode = "CUSTOM" | "BTC_THRESHOLD";
type ThresholdDirection = "ABOVE_OR_EQUAL" | "BELOW";

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function parseUsdcToBaseUnits(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return 0;

  return Math.floor(n * 1_000_000);
}

function parsePriceToE8(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "0";

  const normalized = trimmed.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return "0";

  const [wholeRaw, fracRaw = ""] = normalized.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "") || "0";
  const frac = (fracRaw + "00000000").slice(0, 8);

  return `${whole}${frac}`.replace(/^0+(?=\d)/, "") || "0";
}

function toUtcInputValue(iso: string) {
  return iso ? iso.slice(0, 16) : "";
}

function fromUtcInputValue(value: string) {
  return value ? new Date(`${value}:00Z`).toISOString() : "";
}

function parseUtcIsoToSeconds(iso: string) {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return 0;
  return Math.floor(ms / 1000);
}

function setUtcMinutesFromNow(minutesFromNow: number, roundToMinute: boolean) {
  const now = Math.floor(Date.now() / 1000);
  let ts = now + minutesFromNow * 60;

  if (roundToMinute) {
    ts = Math.ceil(ts / 60) * 60;
  }

  return new Date(ts * 1000).toISOString();
}

function Field(props: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div>
        <div className="text-sm font-semibold text-white">{props.label}</div>
        {props.hint ? (
          <div className="mt-1 text-xs text-white/55">{props.hint}</div>
        ) : null}
      </div>
      {props.children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white",
        "placeholder:text-white/35 outline-none focus:border-white/25"
      )}
    />
  );
}

function ModeCard(props: {
  active: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={clsx(
        "rounded-2xl border p-4 text-left transition",
        props.active
          ? "border-neon/50 bg-neon/10"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
      )}
    >
      <div className="text-sm font-semibold text-white">{props.title}</div>
      <div className="mt-2 text-xs leading-5 text-white/65">{props.body}</div>
    </button>
  );
}

export default function CreatePage() {
  const {
    publicKey,
    wallet,
    signTransaction,
    signAllTransactions,
  } = useWallet();

  const [mode, setMode] = useState<CreateMode>("CUSTOM");
  const [creatorStake, setCreatorStake] = useState("100");
  const [opponentStake, setOpponentStake] = useState("100");

  const [customExpiryIso, setCustomExpiryIso] = useState("");
  const [thresholdSettlementIso, setThresholdSettlementIso] = useState("");
  const [thresholdDirection, setThresholdDirection] =
    useState<ThresholdDirection>("ABOVE_OR_EQUAL");
  const [thresholdStrike, setThresholdStrike] = useState("100000");

  useEffect(() => {
    setCustomExpiryIso(setUtcMinutesFromNow(60, false));
    setThresholdSettlementIso(setUtcMinutesFromNow(15, true));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUpcomingNbaEvents() {
      setIsLoadingUpcomingNbaEvents(true);
      setUpcomingNbaEventsError("");

      try {
        const res = await fetch("/api/sports/nba/upcoming", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load upcoming NBA events.");
        }

        const data = (await res.json()) as UpcomingNbaEventsResponse;

        if (!cancelled) {
          setUpcomingNbaEvents(data.events);
          setSelectedUpcomingNbaEventId((current) =>
            current && data.events.some((event) => event.id === current)
              ? current
              : data.events[0]?.id ?? null
          );
        }
      } catch (error) {
        if (!cancelled) {
          setUpcomingNbaEvents([]);
          setUpcomingNbaEventsError(
            error instanceof Error ? error.message : "Failed to load upcoming NBA events."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingUpcomingNbaEvents(false);
        }
      }
    }

    void loadUpcomingNbaEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdBetPubkey, setCreatedBetPubkey] = useState<string | null>(null);

  const [upcomingNbaEvents, setUpcomingNbaEvents] = useState<UpcomingNbaEvent[]>([]);
  const [selectedUpcomingNbaEventId, setSelectedUpcomingNbaEventId] = useState<string | null>(null);
  const [isLoadingUpcomingNbaEvents, setIsLoadingUpcomingNbaEvents] = useState(false);
  const [upcomingNbaEventsError, setUpcomingNbaEventsError] = useState("");

  const connectedWallet =
    publicKey && wallet && signTransaction && signAllTransactions
      ? {
          publicKey,
          signTransaction,
          signAllTransactions,
        }
      : null;

  const configPda = useMemo(
    () =>
      PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        WANNABET_ESCROW_PROGRAM_ID
      )[0],
    []
  );

  const makerAmountBaseUnits = parseUsdcToBaseUnits(creatorStake);
  const opponentAmountBaseUnits = parseUsdcToBaseUnits(opponentStake);

  const customExpiryTs = parseUtcIsoToSeconds(customExpiryIso);
  const thresholdSettlementTs = parseUtcIsoToSeconds(thresholdSettlementIso);
  const thresholdStrikeE8 = parsePriceToE8(thresholdStrike);

  const selectedUpcomingNbaEvent =
    upcomingNbaEvents.find((event) => event.id === selectedUpcomingNbaEventId) ?? null;

  const previewRows =
    mode === "CUSTOM"
      ? [
          ["Mode", "Custom escrow bet"],
          [
            "Selected NBA event",
            selectedUpcomingNbaEvent
              ? `${selectedUpcomingNbaEvent.awayTeamName} vs ${selectedUpcomingNbaEvent.homeTeamName}`
              : "Not selected",
          ],
          [
            "Event start",
            selectedUpcomingNbaEvent
              ? selectedUpcomingNbaEvent.scheduledStartUtc.replace("T", " ").replace(".000Z", " UTC")
              : "Not selected",
          ],
          ["Your escrow", formatUSDC(makerAmountBaseUnits / 1_000_000)],
          ["Opponent required", formatUSDC(opponentAmountBaseUnits / 1_000_000)],
          [
            "Expiry",
            customExpiryIso
              ? customExpiryIso.replace("T", " ").replace(".000Z", " UTC")
              : "Not set",
          ],
        ]
      : [
          ["Mode", "BTC/USDT threshold"],
          ["Source", "Binance Spot"],
          ["Settlement rule", "1-minute candle close at settlement minute"],
          ["Your escrow", formatUSDC(makerAmountBaseUnits / 1_000_000)],
          ["Opponent required", formatUSDC(opponentAmountBaseUnits / 1_000_000)],
          [
            "Direction",
            thresholdDirection === "ABOVE_OR_EQUAL" ? "Above or equal" : "Below",
          ],
          ["Strike", thresholdStrike || "Not set"],
          [
            "Settlement minute",
            thresholdSettlementIso
              ? thresholdSettlementIso.replace("T", " ").replace(".000Z", " UTC")
              : "Not set",
          ],
        ];

  async function handleCreate() {
    setSubmitError("");
    setCreatedBetPubkey(null);
    setIsSubmitting(true);

    try {
      if (!connectedWallet) {
        setSubmitError("Connect a Solana wallet first.");
        return;
      }

      if (makerAmountBaseUnits <= 0) {
        setSubmitError("Your escrow amount must be greater than 0.");
        return;
      }

      if (opponentAmountBaseUnits <= 0) {
        setSubmitError("Opponent required amount must be greater than 0.");
        return;
      }

      const now = Math.floor(Date.now() / 1000);

      const betId = Date.now();
      const betIdBuffer = Buffer.alloc(8);
      betIdBuffer.writeBigUInt64LE(BigInt(betId));

      const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), connectedWallet.publicKey.toBuffer(), betIdBuffer],
        WANNABET_ESCROW_PROGRAM_ID
      );

      const [escrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), betPda.toBuffer()],
        WANNABET_ESCROW_PROGRAM_ID
      );

      const creatorAta = getAssociatedTokenAddressSync(
        WANNABET_DEVNET_TEST_MINT,
        connectedWallet.publicKey
      );

      const escrowAta = getAssociatedTokenAddressSync(
        WANNABET_DEVNET_TEST_MINT,
        escrowAuthorityPda,
        true
      );

      const program = getWannaBetProgram(connectedWallet);

      if (mode === "CUSTOM") {
        if (!Number.isFinite(customExpiryTs) || customExpiryTs <= 0) {
          setSubmitError("Choose a valid custom expiry.");
          return;
        }

        if (customExpiryTs <= now + 60) {
          setSubmitError("Expiry must be more than 60 seconds in the future.");
          return;
        }

        await program.methods
          .createBet(
            new BN(betId),
            0,
            new BN(makerAmountBaseUnits),
            new BN(opponentAmountBaseUnits),
            new BN(customExpiryTs)
          )
          .accounts({
            creator: connectedWallet.publicKey,
            config: configPda,
            mint: WANNABET_DEVNET_TEST_MINT,
            creatorAta,
            bet: betPda,
            escrowAuthority: escrowAuthorityPda,
            escrowAta,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        if (selectedUpcomingNbaEvent) {
          const [betSportsMetadataPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("bet_sports_metadata"), betPda.toBuffer()],
            WANNABET_ESCROW_PROGRAM_ID
          );

          const providerEventId = Number(selectedUpcomingNbaEvent.providerEventId);
          const homeTeamId = Number(selectedUpcomingNbaEvent.homeTeamId);
          const awayTeamId = Number(selectedUpcomingNbaEvent.awayTeamId);
          const eventStartTs = parseUtcIsoToSeconds(selectedUpcomingNbaEvent.scheduledStartUtc);

          if (
            !Number.isFinite(providerEventId) ||
            !Number.isFinite(homeTeamId) ||
            !Number.isFinite(awayTeamId) ||
            eventStartTs <= 0
          ) {
            throw new Error("Selected NBA event metadata is invalid.");
          }

          await (
            program.methods as unknown as {
              createBetSportsMetadata: (
                provider: { sportsDataIo: Record<string, never> },
                sport: { basketball: Record<string, never> },
                league: { nba: Record<string, never> },
                marketType: { headToHeadWinner: Record<string, never> },
                providerEventId: BN,
                homeTeamId: BN,
                awayTeamId: BN,
                eventStartTs: BN
              ) => {
                accounts: (args: {
                  creator: PublicKey;
                  config: PublicKey;
                  bet: PublicKey;
                  betSportsMetadata: PublicKey;
                  systemProgram: PublicKey;
                }) => { rpc: () => Promise<string> };
              };
            }
          )
            .createBetSportsMetadata(
              { sportsDataIo: {} },
              { basketball: {} },
              { nba: {} },
              { headToHeadWinner: {} },
              new BN(providerEventId),
              new BN(homeTeamId),
              new BN(awayTeamId),
              new BN(eventStartTs)
            )
            .accounts({
              creator: connectedWallet.publicKey,
              config: configPda,
              bet: betPda,
              betSportsMetadata: betSportsMetadataPda,
              systemProgram: SystemProgram.programId,
            })
            .rpc();

          const linkRes = await fetch("/api/bets/link-sports-event", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              betPubkey: betPda.toBase58(),
              event: selectedUpcomingNbaEvent,
            }),
          });

          if (!linkRes.ok) {
            throw new Error("Bet was created, but saving the selected NBA event link failed.");
          }
        }
      } else {
        if (!Number.isFinite(thresholdSettlementTs) || thresholdSettlementTs <= 0) {
          setSubmitError("Choose a valid BTC settlement minute.");
          return;
        }

        if (thresholdSettlementTs % 60 !== 0) {
          setSubmitError("BTC settlement must be aligned to an exact UTC minute.");
          return;
        }

        if (thresholdSettlementTs <= now + 60) {
          setSubmitError(
            "BTC settlement minute must be more than 60 seconds in the future."
          );
          return;
        }

        if (thresholdStrikeE8 === "0") {
          setSubmitError("Enter a valid BTC strike price.");
          return;
        }

        const comparatorArg =
          thresholdDirection === "ABOVE_OR_EQUAL"
            ? { greaterThanOrEqual: {} }
            : { lessThan: {} };

        await (
          program.methods as unknown as {
            createCryptoPriceBet: (
              betId: BN,
              creatorSide: number,
              creatorAmount: BN,
              accepterAmountRequired: BN,
              settlementMinuteTs: BN,
              comparator: { greaterThanOrEqual: Record<string, never> } | { lessThan: Record<string, never> },
              strikeE8: BN
            ) => {
              accounts: (args: {
                creator: PublicKey;
                config: PublicKey;
                mint: PublicKey;
                creatorAta: PublicKey;
                bet: PublicKey;
                escrowAuthority: PublicKey;
                escrowAta: PublicKey;
                tokenProgram: PublicKey;
                associatedTokenProgram: PublicKey;
                systemProgram: PublicKey;
              }) => { rpc: () => Promise<string> };
            };
          })
          .createCryptoPriceBet(
            new BN(betId),
            0,
            new BN(makerAmountBaseUnits),
            new BN(opponentAmountBaseUnits),
            new BN(thresholdSettlementTs),
            comparatorArg,
            new BN(thresholdStrikeE8)
          )
          .accounts({
            creator: connectedWallet.publicKey,
            config: configPda,
            mint: WANNABET_DEVNET_TEST_MINT,
            creatorAta,
            bet: betPda,
            escrowAuthority: escrowAuthorityPda,
            escrowAta,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      }

      setCreatedBetPubkey(betPda.toBase58());
    } catch (error) {
      console.error(error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create bet."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-panel p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
          Truth-first create flow
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
          Create a real devnet bet
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          This page only shows flows that are actually supported on-chain right
          now.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-xl border border-white/10 bg-panel p-5">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-white">Choose bet type</div>
            <div className="grid gap-3 md:grid-cols-2">
              <ModeCard
                active={mode === "CUSTOM"}
                title="Custom escrow bet"
                body="Generic escrow bet. Funds lock on-chain. Outcome can be resolved later through the custom path."
                onClick={() => setMode("CUSTOM")}
              />
              <ModeCard
                active={mode === "BTC_THRESHOLD"}
                title="BTC/USDT threshold bet"
                body="Real supported automated market. Binance Spot. 1-minute candle close at the selected settlement minute."
                onClick={() => setMode("BTC_THRESHOLD")}
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  Upcoming NBA events
                </div>
                <div className="mt-1 text-xs text-white/55">
                  Loaded from WannaBet&apos;s internal sports event catalogue.
                </div>
              </div>
              {isLoadingUpcomingNbaEvents ? (
                <div className="text-xs text-white/50">Loading...</div>
              ) : null}
            </div>

            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/85">
              NBA event selection is preview-only right now. Create bet still submits the existing generic on-chain custom escrow flow.
            </div>

            {upcomingNbaEventsError ? (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {upcomingNbaEventsError}
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              {upcomingNbaEvents.slice(0, 5).map((event) => {
                const isSelected = event.id === selectedUpcomingNbaEventId;

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedUpcomingNbaEventId(event.id)}
                    className={clsx(
                      "w-full rounded-lg border px-3 py-3 text-left transition",
                      isSelected
                        ? "border-neon/40 bg-neon/10"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                    )}
                  >
                    <div className="text-sm font-semibold text-white">
                      {event.awayTeamName} vs {event.homeTeamName}
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {event.scheduledStartUtc.replace("T", " ").replace(".000Z", " UTC")}
                    </div>
                  </button>
                );
              })}

              {!isLoadingUpcomingNbaEvents &&
              !upcomingNbaEventsError &&
              upcomingNbaEvents.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/60">
                  No upcoming NBA events found.
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Your escrow (USDC)" hint="Amount you lock as maker.">
              <Input
                inputMode="decimal"
                value={creatorStake}
                onChange={(e) => setCreatorStake(e.target.value)}
                placeholder="100"
              />
            </Field>

            <Field
              label="Opponent required (USDC)"
              hint="Amount the accepter must lock."
            >
              <Input
                inputMode="decimal"
                value={opponentStake}
                onChange={(e) => setOpponentStake(e.target.value)}
                placeholder="100"
              />
            </Field>
          </div>

          {mode === "CUSTOM" ? (
            <div className="space-y-4">
              <Field
                label="Expiry (UTC)"
                hint="Custom escrow bets only need a future expiry."
              >
                <Input
                  type="datetime-local"
                  value={toUtcInputValue(customExpiryIso)}
                  onChange={(e) =>
                    setCustomExpiryIso(fromUtcInputValue(e.target.value))
                  }
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCustomExpiryIso(setUtcMinutesFromNow(15, false))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 hover:border-white/20 hover:bg-white/10"
                >
                  +15m
                </button>
                <button
                  type="button"
                  onClick={() => setCustomExpiryIso(setUtcMinutesFromNow(60, false))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 hover:border-white/20 hover:bg-white/10"
                >
                  +1h
                </button>
                <button
                  type="button"
                  onClick={() => setCustomExpiryIso(setUtcMinutesFromNow(1440, false))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 hover:border-white/20 hover:bg-white/10"
                >
                  +24h
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-neon/30 bg-neon/10 p-4 text-sm text-white/80">
                <div className="font-semibold text-neon">Supported market spec</div>
                <div className="mt-2 space-y-1 text-xs text-white/70">
                  <div>Symbol: BTC/USDT</div>
                  <div>Venue: Binance Spot</div>
                  <div>Settlement: close of the 1-minute candle at the selected UTC minute</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Direction" hint="Above/equal or below at settlement.">
                  <select
                    value={thresholdDirection}
                    onChange={(e) =>
                      setThresholdDirection(
                        e.target.value as ThresholdDirection
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none focus:border-white/25"
                  >
                    <option value="ABOVE_OR_EQUAL">Above or equal</option>
                    <option value="BELOW">Below</option>
                  </select>
                </Field>

                <Field label="BTC strike price" hint="Stored on-chain as e8.">
                  <Input
                    inputMode="decimal"
                    value={thresholdStrike}
                    onChange={(e) => setThresholdStrike(e.target.value)}
                    placeholder="100000"
                  />
                </Field>
              </div>

              <Field
                label="Settlement minute (UTC)"
                hint="Must be an exact UTC minute and more than 60 seconds in the future."
              >
                <Input
                  type="datetime-local"
                  value={toUtcInputValue(thresholdSettlementIso)}
                  onChange={(e) =>
                    setThresholdSettlementIso(fromUtcInputValue(e.target.value))
                  }
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setThresholdSettlementIso(setUtcMinutesFromNow(5, true))
                  }
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 hover:border-white/20 hover:bg-white/10"
                >
                  +5m
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setThresholdSettlementIso(setUtcMinutesFromNow(15, true))
                  }
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 hover:border-white/20 hover:bg-white/10"
                >
                  +15m
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setThresholdSettlementIso(setUtcMinutesFromNow(60, true))
                  }
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75 hover:border-white/20 hover:bg-white/10"
                >
                  +1h
                </button>
              </div>
            </div>
          )}

          {submitError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {submitError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-neon/40 bg-neon/15 px-4 py-3 text-sm font-semibold text-neon transition hover:bg-neon/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating..." : "Create bet"}
          </button>
        </div>

        <aside className="rounded-xl border border-white/10 bg-panel p-5">
          <div className="text-sm font-semibold text-white">Preview</div>

          <div className="mt-4 space-y-3">
            {previewRows.map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
                  {label}
                </div>
                <div className="mt-1 text-sm text-white/85">{value}</div>
              </div>
            ))}
          </div>

          {createdBetPubkey ? (
            <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="text-sm font-semibold text-emerald-200">
                Bet created successfully
              </div>
              <div className="mt-2 break-all text-xs text-emerald-100/80">
                {createdBetPubkey}
              </div>
              <Link
                href={`/bets/${createdBetPubkey}`}
                className="mt-4 inline-flex rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/20"
              >
                View bet
              </Link>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
