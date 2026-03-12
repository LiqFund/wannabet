import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import fs from "fs";
import path from "path";

const rpcUrl = "https://api.devnet.solana.com";
const idlPath = path.resolve("onchain/wannabet_escrow/target/idl/wannabet_escrow.json");

const betArg = process.argv[2];
const walletPathArg = process.argv[3];

if (!betArg || !walletPathArg) {
  console.error("Usage: node onchain/wannabet_escrow/scripts/claim-winnings-devnet.mjs <BET_PUBKEY> <WALLET_JSON_PATH>");
  process.exit(1);
}

const betPubkey = new PublicKey(betArg);
const walletPath = path.resolve(walletPathArg);

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

const [escrowAuthority] = PublicKey.findProgramAddressSync(
  [Buffer.from("escrow"), betPubkey.toBuffer()],
  programId
);

const bet = await program.account.bet.fetch(betPubkey);
const config = await program.account.config.fetch(configPda);

const claimant = wallet.publicKey;
const winner =
  Number(bet.winnerSide) === Number(bet.creatorSide) ? bet.creator : bet.accepter;

if (!winner.equals(claimant)) {
  console.error("This wallet is not the winner for this bet.");
  console.error("Winner:", winner.toBase58());
  console.error("Claimant:", claimant.toBase58());
  process.exit(1);
}

const claimantAta = getAssociatedTokenAddressSync(
  bet.mint,
  claimant,
  false
);

const escrowAta = getAssociatedTokenAddressSync(
  bet.mint,
  escrowAuthority,
  true
);

console.log("Wallet:", claimant.toBase58());
console.log("Wallet file:", walletPath);
console.log("Program:", programId.toBase58());
console.log("Config PDA:", configPda.toBase58());
console.log("Bet:", betPubkey.toBase58());
console.log("Winner:", winner.toBase58());
console.log("Mint:", bet.mint.toBase58());
console.log("Claimant ATA:", claimantAta.toBase58());
console.log("Fee vault:", config.feeVault.toBase58());
console.log("Escrow Authority:", escrowAuthority.toBase58());
console.log("Escrow ATA:", escrowAta.toBase58());

const tx = await program.methods
  .claimWinnings()
  .accounts({
    claimant,
    config: configPda,
    bet: betPubkey,
    mint: bet.mint,
    claimantAta,
    feeVault: config.feeVault,
    escrowAuthority,
    escrowAta,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();

console.log("Claim TX:", tx);
