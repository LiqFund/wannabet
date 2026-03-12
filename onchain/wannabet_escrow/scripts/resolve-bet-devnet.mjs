import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

const rpcUrl = "https://api.devnet.solana.com";
const walletPath = path.join(os.homedir(), ".config/solana/id.json");
const idlPath = path.resolve("onchain/wannabet_escrow/target/idl/wannabet_escrow.json");

const betArg = process.argv[2];
const winnerSideArg = process.argv[3];

if (!betArg || winnerSideArg === undefined) {
  console.error("Usage: node onchain/wannabet_escrow/scripts/resolve-bet-devnet.mjs <BET_PUBKEY> <WINNER_SIDE_0_OR_1>");
  process.exit(1);
}

const betPubkey = new PublicKey(betArg);
const winnerSide = Number(winnerSideArg);

if (![0, 1].includes(winnerSide)) {
  console.error("winner side must be 0 or 1");
  process.exit(1);
}

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
console.log("Winner side:", winnerSide);

const tx = await program.methods
  .resolveBet(winnerSide)
  .accounts({
    admin: wallet.publicKey,
    config: configPda,
    bet: betPubkey,
  })
  .rpc();

console.log("Resolve TX:", tx);
