import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

const rpcUrl = "https://api.devnet.solana.com";
const walletPath = path.join(os.homedir(), ".config/solana/id.json");
const idlPath = path.resolve("onchain/wannabet_escrow/target/idl/wannabet_escrow.json");

const feeBpsArg = process.argv[2];

if (!feeBpsArg) {
  console.error("Usage: node onchain/wannabet_escrow/scripts/set-fee-bps-devnet.mjs <FEE_BPS>");
  process.exit(1);
}

const feeBps = Number(feeBpsArg);

if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10000) {
  console.error("FEE_BPS must be an integer between 0 and 10000.");
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
console.log("New fee bps:", feeBps);

const tx = await program.methods
  .setFeeBps(feeBps)
  .accounts({
    admin: wallet.publicKey,
    config: configPda,
  })
  .rpc();

console.log("Set fee bps TX:", tx);
