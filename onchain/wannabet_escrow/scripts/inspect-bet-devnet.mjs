import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import fs from "fs";
import os from "os";
import path from "path";

const rpcUrl = "https://api.devnet.solana.com";
const walletPath = path.join(os.homedir(), ".config/solana/id.json");
const idlPath = path.resolve("onchain/wannabet_escrow/target/idl/wannabet_escrow.json");

const betArg = process.argv[2];

if (!betArg) {
  console.error("Usage: node onchain/wannabet_escrow/scripts/inspect-bet-devnet.mjs <BET_PUBKEY>");
  process.exit(1);
}

const betPubkey = new PublicKey(betArg);

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
const programId = program.programId;

function enumName(value) {
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length > 0) return keys[0];
  }
  return String(value);
}

const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  programId
);

const [escrowAuthority] = PublicKey.findProgramAddressSync(
  [Buffer.from("escrow"), betPubkey.toBuffer()],
  programId
);

const bet = await program.account.bet.fetch(betPubkey);
const escrowAta = getAssociatedTokenAddressSync(
  bet.mint,
  escrowAuthority,
  true
);

let escrowBalance = "unavailable";
try {
  const bal = await connection.getTokenAccountBalance(escrowAta, "confirmed");
  escrowBalance = bal.value.amount;
} catch (err) {
  escrowBalance = "0 or account missing";
}

console.log("Wallet:", wallet.publicKey.toBase58());
console.log("Program:", programId.toBase58());
console.log("Config PDA:", configPda.toBase58());
console.log("Bet:", betPubkey.toBase58());
console.log("Escrow Authority:", escrowAuthority.toBase58());
console.log("Escrow ATA:", escrowAta.toBase58());
console.log("Escrow ATA Balance:", escrowBalance);
console.log("");

console.log("creator:", bet.creator.toBase58());
console.log("accepter:", bet.accepter.toBase58());
console.log("mint:", bet.mint.toBase58());
console.log("creatorAmount:", bet.creatorAmount.toString());
console.log("accepterAmountRequired:", bet.accepterAmountRequired.toString());
console.log("accepterAmount:", bet.accepterAmount.toString());
console.log("expiryTs:", bet.expiryTs.toString());
console.log("state:", enumName(bet.state));
console.log("creatorSide:", Number(bet.creatorSide));
console.log("accepterSide:", Number(bet.accepterSide));
console.log("winnerSide:", Number(bet.winnerSide));
console.log("betVersion:", Number(bet.betVersion));
console.log("marketKind:", enumName(bet.marketKind));
console.log("priceSymbol:", enumName(bet.priceSymbol));
console.log("priceVenue:", enumName(bet.priceVenue));
console.log("settlementMinuteTs:", bet.settlementMinuteTs.toString());
console.log("comparator:", enumName(bet.comparator));
console.log("strikeE8:", bet.strikeE8.toString());
console.log("resolvedPriceE8:", bet.resolvedPriceE8.toString());
console.log("resolvedAtTs:", bet.resolvedAtTs.toString());
console.log("resolutionStatus:", enumName(bet.resolutionStatus));
console.log("payoutClaimed:", Boolean(bet.payoutClaimed));
console.log("creatorRefundClaimed:", Boolean(bet.creatorRefundClaimed));
console.log("accepterRefundClaimed:", Boolean(bet.accepterRefundClaimed));
console.log("betId:", bet.betId.toString());
console.log("bump:", Number(bet.bump));
