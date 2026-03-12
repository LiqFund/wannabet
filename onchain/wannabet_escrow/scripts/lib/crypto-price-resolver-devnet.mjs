import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

export const rpcUrl = "https://api.devnet.solana.com";
export const walletPath = path.join(os.homedir(), ".config/solana/id.json");
export const idlPath = path.resolve("onchain/wannabet_escrow/target/idl/wannabet_escrow.json");

export const BET_ACCOUNT_DISCRIMINATOR_BASE58 = anchor.utils.bytes.bs58.encode(
  Uint8Array.from([147, 23, 35, 59, 15, 75, 155, 32])
);

const secret = JSON.parse(fs.readFileSync(walletPath, "utf8"));
const walletKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));

export const connection = new Connection(rpcUrl, "confirmed");
export const wallet = new anchor.Wallet(walletKeypair);
export const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});

anchor.setProvider(provider);

const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
export const program = new anchor.Program(idl, provider);

export function readAnchorNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "bigint") return Number(value);
  if (typeof value.toNumber === "function") return value.toNumber();
  if (typeof value.toString === "function") {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function readPubkey(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value.toBase58 === "function") return value.toBase58();
  if (typeof value.toString === "function") return value.toString();
  return fallback;
}

export function readEnumName(value) {
  if (!value || typeof value !== "object") return "unknown";
  const keys = Object.keys(value);
  if (keys.length === 0) return "unknown";
  return keys[0];
}

export function formatUtcFromSeconds(ts) {
  if (!ts || ts <= 0) return "n/a";
  return new Date(ts * 1000).toISOString().replace(".000Z", " UTC");
}

export function decimalPriceToE8(priceString) {
  const [wholePartRaw, fracPartRaw = ""] = String(priceString).split(".");
  const wholePart = wholePartRaw.replace(/^0+(?=\d)/, "") || "0";
  const fracPadded = (fracPartRaw + "00000000").slice(0, 8);
  return `${wholePart}${fracPadded}`.replace(/^0+(?=\d)/, "") || "0";
}

export function computeWinnerSide(bet, resolvedPriceE8) {
  if (bet.comparator === "greaterThanOrEqual") {
    return BigInt(resolvedPriceE8) >= BigInt(bet.strikeE8) ? bet.creatorSide : bet.accepterSide;
  }

  if (bet.comparator === "lessThan") {
    return BigInt(resolvedPriceE8) < BigInt(bet.strikeE8) ? bet.creatorSide : bet.accepterSide;
  }

  throw new Error(`Unsupported comparator: ${bet.comparator}`);
}

export async function fetchBinanceMinuteClose(settlementMinuteTs) {
  const startTime = settlementMinuteTs * 1000;
  const endTime = (settlementMinuteTs + 60) * 1000;
  const url =
    `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&startTime=${startTime}&endTime=${endTime}&limit=1`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Binance HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length !== 1 || !Array.isArray(data[0])) {
    throw new Error(`Unexpected Binance response: ${JSON.stringify(data)}`);
  }

  const candle = data[0];
  return {
    openTimeMs: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
    closeTimeMs: candle[6],
  };
}

export function isSupportedCryptoPriceBet(bet) {
  return (
    bet.marketKind === "cryptoPriceBinary" &&
    bet.priceSymbol === "btcUsdt" &&
    bet.priceVenue === "binanceSpot"
  );
}

export function getReadinessStatus(bet, nowTs) {
  if (bet.state !== "locked") return "not_locked";
  if (bet.resolutionStatus !== "pending") return "not_pending";
  if (!isSupportedCryptoPriceBet(bet)) return "unsupported_market";
  if (bet.settlementMinuteTs <= 0) return "invalid_settlement";
  if (bet.settlementMinuteTs + 60 > nowTs) return "awaiting_candle_close";
  return "ready";
}

export async function collectCryptoPriceBetStatuses() {
  const rawAccounts = await connection.getProgramAccounts(program.programId, {
    commitment: "confirmed",
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: BET_ACCOUNT_DISCRIMINATOR_BASE58,
        },
      },
    ],
  });

  const nowTs = Math.floor(Date.now() / 1000);

  const summary = {
    totalProgramBetAccounts: rawAccounts.length,
    unreadableCount: 0,
    unreadablePubkeys: [],
    statusCounts: {
      ready: 0,
      awaiting_candle_close: 0,
      unsupported_market: 0,
      not_locked: 0,
      not_pending: 0,
      invalid_settlement: 0,
    },
  };

  const bets = [];

  for (const { pubkey } of rawAccounts) {
    try {
      const account = await program.account.bet.fetchNullable(pubkey);

      if (!account) {
        continue;
      }

      const bet = {
        pubkey: pubkey.toBase58(),
        creator: readPubkey(account.creator),
        accepter: readPubkey(account.accepter),
        state: readEnumName(account.state),
        resolutionStatus: readEnumName(account.resolutionStatus),
        marketKind: readEnumName(account.marketKind),
        priceSymbol: readEnumName(account.priceSymbol),
        priceVenue: readEnumName(account.priceVenue),
        comparator: readEnumName(account.comparator),
        settlementMinuteTs: readAnchorNumber(account.settlementMinuteTs, 0),
        strikeE8: String(account.strikeE8 ?? "0"),
        creatorAmount: readAnchorNumber(account.creatorAmount, 0),
        accepterAmount: readAnchorNumber(account.accepterAmount, 0),
        creatorSide: readAnchorNumber(account.creatorSide, 0),
        accepterSide: readAnchorNumber(account.accepterSide, 0),
        winnerSide: readAnchorNumber(account.winnerSide, 0),
        payoutClaimed: Boolean(account.payoutClaimed),
      };

      const readiness = getReadinessStatus(bet, nowTs);
      summary.statusCounts[readiness] += 1;
      bets.push({ ...bet, readiness });
    } catch {
      summary.unreadableCount += 1;
      summary.unreadablePubkeys.push(pubkey.toBase58());
    }
  }

  bets.sort((a, b) => a.settlementMinuteTs - b.settlementMinuteTs);

  return {
    nowTs,
    bets,
    readyBets: bets.filter((bet) => bet.readiness === "ready"),
    summary,
  };
}

export function printPipelineHeader(label) {
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program:", program.programId.toBase58());
  console.log(label);
  console.log("");
}

export function printStatusSummary(nowTs, summary) {
  console.log("Current UTC:", formatUtcFromSeconds(nowTs));
  console.log("Total discriminator-matched bet accounts:", summary.totalProgramBetAccounts);
  console.log("Unreadable bet accounts:", summary.unreadableCount);
  console.log("Ready:", summary.statusCounts.ready);
  console.log("Awaiting candle close:", summary.statusCounts.awaiting_candle_close);
  console.log("Unsupported market:", summary.statusCounts.unsupported_market);
  console.log("Not locked:", summary.statusCounts.not_locked);
  console.log("Not pending:", summary.statusCounts.not_pending);
  console.log("Invalid settlement:", summary.statusCounts.invalid_settlement);
  console.log("");
}

export function printUnreadablePubkeys(summary) {
  if (summary.unreadablePubkeys.length === 0) return;

  console.log("Unreadable bet accounts:");
  for (const pubkey of summary.unreadablePubkeys) {
    console.log(" ", pubkey);
  }
  console.log("");
}

export function printReadyBetCore(bet) {
  console.log("Bet:", bet.pubkey);
  console.log("  creator:", bet.creator);
  console.log("  accepter:", bet.accepter);
  console.log("  state:", bet.state);
  console.log("  resolutionStatus:", bet.resolutionStatus);
  console.log("  marketKind:", bet.marketKind);
  console.log("  priceSymbol:", bet.priceSymbol);
  console.log("  priceVenue:", bet.priceVenue);
  console.log("  comparator:", bet.comparator);
  console.log(
    "  settlementMinuteTs:",
    bet.settlementMinuteTs,
    `(${formatUtcFromSeconds(bet.settlementMinuteTs)})`
  );
  console.log("  strikeE8:", bet.strikeE8);
  console.log("  creatorAmount:", bet.creatorAmount);
  console.log("  accepterAmount:", bet.accepterAmount);
  console.log("  payoutClaimed:", bet.payoutClaimed);
}
