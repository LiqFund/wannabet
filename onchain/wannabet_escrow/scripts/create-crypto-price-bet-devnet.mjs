import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

const rpcUrl = "https://api.devnet.solana.com";
const walletPath = path.join(os.homedir(), ".config/solana/id.json");
const idlPath = path.resolve("onchain/wannabet_escrow/target/idl/wannabet_escrow.json");

const DEVNET_MINT = new PublicKey("41HMG3gXWky6c5HRo7z9moHuPWc2dk7EXQRxwEa2huqu");

const betIdArg = process.argv[2];
const creatorSideArg = process.argv[3];
const creatorAmountArg = process.argv[4];
const accepterAmountRequiredArg = process.argv[5];
const settlementMinuteTsArg = process.argv[6];
const comparatorArg = process.argv[7];
const strikeE8Arg = process.argv[8];

if (
  !betIdArg ||
  creatorSideArg === undefined ||
  creatorAmountArg === undefined ||
  accepterAmountRequiredArg === undefined ||
  settlementMinuteTsArg === undefined ||
  comparatorArg === undefined ||
  strikeE8Arg === undefined
) {
  console.error(
    "Usage: node onchain/wannabet_escrow/scripts/create-crypto-price-bet-devnet.mjs <BET_ID> <CREATOR_SIDE_0_OR_1> <CREATOR_AMOUNT_BASE_UNITS> <ACCEPTER_AMOUNT_REQUIRED_BASE_UNITS> <SETTLEMENT_MINUTE_TS> <COMPARATOR:GTE|LT> <STRIKE_E8>"
  );
  process.exit(1);
}

const betId = new BN(betIdArg);
const creatorSide = Number(creatorSideArg);
const creatorAmount = new BN(creatorAmountArg);
const accepterAmountRequired = new BN(accepterAmountRequiredArg);
const settlementMinuteTs = new BN(settlementMinuteTsArg);
const strikeE8 = new BN(strikeE8Arg);

if (![0, 1].includes(creatorSide)) {
  console.error("creator side must be 0 or 1");
  process.exit(1);
}

const normalizedComparator = comparatorArg.trim().toUpperCase();

let comparator;
if (normalizedComparator === "GTE") {
  comparator = { greaterThanOrEqual: {} };
} else if (normalizedComparator === "LT") {
  comparator = { lessThan: {} };
} else {
  console.error('comparator must be "GTE" or "LT"');
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

const creatorAta = getAssociatedTokenAddressSync(
  DEVNET_MINT,
  wallet.publicKey,
  false
);

const [betPda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("bet"),
    wallet.publicKey.toBuffer(),
    betId.toArrayLike(Buffer, "le", 8),
  ],
  programId
);

const [escrowAuthority] = PublicKey.findProgramAddressSync(
  [Buffer.from("escrow"), betPda.toBuffer()],
  programId
);

const escrowAta = getAssociatedTokenAddressSync(
  DEVNET_MINT,
  escrowAuthority,
  true
);

console.log("Wallet:", wallet.publicKey.toBase58());
console.log("Program:", programId.toBase58());
console.log("Config PDA:", configPda.toBase58());
console.log("Mint:", DEVNET_MINT.toBase58());
console.log("Creator ATA:", creatorAta.toBase58());
console.log("Bet PDA:", betPda.toBase58());
console.log("Escrow Authority:", escrowAuthority.toBase58());
console.log("Escrow ATA:", escrowAta.toBase58());
console.log("betId:", betId.toString());
console.log("creatorSide:", creatorSide);
console.log("creatorAmount:", creatorAmount.toString());
console.log("accepterAmountRequired:", accepterAmountRequired.toString());
console.log("settlementMinuteTs:", settlementMinuteTs.toString());
console.log("comparator:", normalizedComparator);
console.log("strikeE8:", strikeE8.toString());

const tx = await program.methods
  .createCryptoPriceBet(
    betId,
    creatorSide,
    creatorAmount,
    accepterAmountRequired,
    settlementMinuteTs,
    comparator,
    strikeE8
  )
  .accounts({
    creator: wallet.publicKey,
    config: configPda,
    mint: DEVNET_MINT,
    creatorAta,
    bet: betPda,
    escrowAuthority,
    escrowAta,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log("Create TX:", tx);
console.log("Created Bet:", betPda.toBase58());
