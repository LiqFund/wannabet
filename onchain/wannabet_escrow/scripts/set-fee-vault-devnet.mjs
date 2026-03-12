import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

const rpcUrl = "https://api.devnet.solana.com";
const walletPath = path.join(os.homedir(), ".config/solana/id.json");
const idlPath = path.resolve("onchain/wannabet_escrow/target/idl/wannabet_escrow.json");

const feeVaultArg = process.argv[2];

if (!feeVaultArg) {
  console.error("Usage: node onchain/wannabet_escrow/scripts/set-fee-vault-devnet.mjs <FEE_VAULT_TOKEN_ACCOUNT>");
  process.exit(1);
}

const feeVault = new PublicKey(feeVaultArg);

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
console.log("New fee vault:", feeVault.toBase58());

const tx = await program.methods
  .setFeeVault()
  .accounts({
    admin: wallet.publicKey,
    config: configPda,
    feeVault,
  })
  .rpc();

console.log("Set fee vault TX:", tx);
