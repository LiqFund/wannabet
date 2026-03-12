import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

const rpcUrl = "https://api.devnet.solana.com";
const walletPath = path.join(os.homedir(), ".config/solana/id.json");
const idlPath = path.resolve("onchain/wannabet_escrow/target/idl/wannabet_escrow.json");

const BET_ACCOUNT_DISCRIMINATOR_BASE58 = anchor.utils.bytes.bs58.encode(
  Uint8Array.from([147, 23, 35, 59, 15, 75, 155, 32])
);

const secret = JSON.parse(fs.readFileSync(walletPath, "utf8"));
const walletKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));

const connection = new Connection(rpcUrl, "confirmed");
const wallet = new anchor.Wallet(walletKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);

const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
const program = new anchor.Program(idl, provider);

function readAnchorNumber(value, fallback = 0) {
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

function readPubkey(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value.toBase58 === "function") return value.toBase58();
  if (typeof value.toString === "function") return value.toString();
  return fallback;
}

function readEnumName(value) {
  if (!value || typeof value !== "object") return "unknown";
  const keys = Object.keys(value);
  if (keys.length === 0) return "unknown";
  return keys[0];
}

function formatUtcFromSeconds(ts) {
  if (!ts || ts <= 0) return "n/a";
  return new Date(ts * 1000).toISOString().replace(".000Z", " UTC");
}

console.log("Wallet:", wallet.publicKey.toBase58());
console.log("Program:", program.programId.toBase58());
console.log("Scanning devnet bets for resolver candidates...");
console.log("");

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
const candidates = [];

for (const { pubkey } of rawAccounts) {
  try {
    const account = await program.account.bet.fetchNullable(pubkey);

    if (!account) {
      continue;
    }

    const state = readEnumName(account.state);
    const resolutionStatus = readEnumName(account.resolutionStatus);
    const marketKind = readEnumName(account.marketKind);
    const priceSymbol = readEnumName(account.priceSymbol);
    const priceVenue = readEnumName(account.priceVenue);
    const comparator = readEnumName(account.comparator);

    const settlementMinuteTs = readAnchorNumber(account.settlementMinuteTs, 0);
    const strikeE8 = readAnchorNumber(account.strikeE8, 0);
    const creatorAmount = readAnchorNumber(account.creatorAmount, 0);
    const accepterAmount = readAnchorNumber(account.accepterAmount, 0);

    const bet = {
      pubkey: pubkey.toBase58(),
      creator: readPubkey(account.creator),
      accepter: readPubkey(account.accepter),
      state,
      resolutionStatus,
      marketKind,
      priceSymbol,
      priceVenue,
      comparator,
      settlementMinuteTs,
      strikeE8,
      creatorAmount,
      accepterAmount,
      winnerSide: readAnchorNumber(account.winnerSide, 0),
      payoutClaimed: Boolean(account.payoutClaimed),
    };

    const isCandidate =
      bet.state === "locked" &&
      bet.resolutionStatus === "pending" &&
      bet.marketKind === "cryptoPriceBinary" &&
      bet.priceSymbol === "btcUsdt" &&
      bet.priceVenue === "binanceSpot" &&
      bet.settlementMinuteTs > 0 &&
      bet.settlementMinuteTs + 60 <= nowTs;

    if (isCandidate) {
      candidates.push(bet);
    }
  } catch (err) {
    console.error("Skipping unreadable bet account:", pubkey.toBase58());
  }
}

candidates.sort((a, b) => a.settlementMinuteTs - b.settlementMinuteTs);

console.log("Current UTC:", formatUtcFromSeconds(nowTs));
console.log("Candidate count:", candidates.length);
console.log("");

if (candidates.length === 0) {
  console.log("No BTC/USDT Binance resolver candidates are ready right now.");
  process.exit(0);
}

for (const bet of candidates) {
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
  console.log("");
}