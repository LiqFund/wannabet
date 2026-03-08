import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

const rpcUrl = "https://api.devnet.solana.com";
const walletPath = path.join(os.homedir(), ".config/solana/id.json");
const secret = JSON.parse(fs.readFileSync(walletPath, "utf8"));
const walletKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));

const connection = new Connection(rpcUrl, "confirmed");
const wallet = new anchor.Wallet(walletKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);

const idl = JSON.parse(
  fs.readFileSync(
    "/workspaces/wannabet/onchain/wannabet_escrow/target/idl/wannabet_escrow.json",
    "utf8"
  )
);

const programId = new PublicKey("H1fMNM3LC2Ljy6auyBVzeTvE2aeG4CTDRhpm6crn5bVW");
const program = new anchor.Program(idl, provider);

const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  programId
);

const feeVault = new PublicKey("5Tq3xNSGDQnnVLZVTHsAikczYCNecVreMZLjdQNP3iQH");

console.log("Wallet:", wallet.publicKey.toBase58());
console.log("Program:", programId.toBase58());
console.log("Config PDA:", configPda.toBase58());
console.log("Fee vault:", feeVault.toBase58());

const tx = await program.methods
  .initializeConfig(0, feeVault)
  .accounts({
    payer: wallet.publicKey,
    config: configPda,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .rpc();

console.log("TX:", tx);
