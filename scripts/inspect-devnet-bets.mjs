import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import fs from "fs";

const idl = JSON.parse(
  fs.readFileSync("/workspaces/wannabet/lib/idl/wannabet_escrow.json", "utf8")
);

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const dummyWallet = {
  publicKey: Keypair.generate().publicKey,
  signTransaction: async (tx) => tx,
  signAllTransactions: async (txs) => txs,
};

const provider = new anchor.AnchorProvider(connection, dummyWallet, {
  commitment: "confirmed",
});

const program = new anchor.Program(idl, provider);

const bets = await program.account.bet.all();

console.log("TOTAL_BETS=", bets.length);

for (const item of bets) {
  console.log("-----");
  console.log("PUBKEY=", item.publicKey.toBase58());
  console.log(
    JSON.stringify(
      item.account,
      (_, value) => {
        if (value && typeof value === "object" && typeof value.toBase58 === "function") {
          return value.toBase58();
        }
        if (typeof value === "bigint") {
          return value.toString();
        }
        if (value && typeof value === "object" && value.constructor && value.constructor.name === "BN") {
          return value.toString();
        }
        return value;
      },
      2
    )
  );
}
