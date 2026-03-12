import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

const rpcUrl = "https://api.devnet.solana.com";
const walletPath = path.join(os.homedir(), ".config/solana/id.json");
const idlPath = path.resolve("onchain/wannabet_escrow/target/idl/wannabet_escrow.json");

const betArg = process.argv[2];
const resolvedPriceE8Arg = process.argv[3];

if (!betArg || !resolvedPriceE8Arg) {
  console.error(
    "Usage: node onchain/wannabet_escrow/scripts/resolve-crypto-price-bet-devnet.mjs <BET_PUBKEY> <RESOLVED_PRICE_E8>"
  );
  process.exit(1);
}

const betPubkey = new PublicKey(betArg);
const resolvedPriceE8 = new BN(resolvedPriceE8Arg);

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

const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  programId
);

console.log("Wallet:", wallet.publicKey.toBase58());
console.log("Program:", programId.toBase58());
console.log("Config PDA:", configPda.toBase58());
console.log("Bet:", betPubkey.toBase58());
console.log("resolvedPriceE8:", resolvedPriceE8.toString());

const tx = await program.methods
  .resolveCryptoPriceBet(resolvedPriceE8)
  .accounts({
    admin: wallet.publicKey,
    config: configPda,
    bet: betPubkey,
  })
  .rpc();

console.log("Resolve TX:", tx);
