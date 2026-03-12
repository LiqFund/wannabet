import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createAccount } from "@solana/spl-token";
import fs from "fs";
import os from "os";
import path from "path";

const rpcUrl = "https://api.devnet.solana.com";
const payerWalletPath = path.join(os.homedir(), ".config/solana/id.json");

const mintArg = process.argv[2];
const ownerArg = process.argv[3];

if (!mintArg || !ownerArg) {
  console.error("Usage: node onchain/wannabet_escrow/scripts/create-fee-vault-devnet.mjs <MINT_PUBKEY> <OWNER_PUBKEY>");
  process.exit(1);
}

const mint = new PublicKey(mintArg);
const owner = new PublicKey(ownerArg);

const secret = JSON.parse(fs.readFileSync(payerWalletPath, "utf8"));
const payerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret));

const connection = new Connection(rpcUrl, "confirmed");

console.log("Payer wallet:", payerKeypair.publicKey.toBase58());
console.log("Mint:", mint.toBase58());
console.log("Fee vault owner:", owner.toBase58());

const feeVault = await createAccount(
  connection,
  payerKeypair,
  mint,
  owner
);

console.log("New fee vault:", feeVault.toBase58());
