import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import idl from "@/lib/idl/wannabet_escrow.json";
import { SOLANA_RPC_URL, WANNABET_ESCROW_PROGRAM_ID } from "@/lib/solana";

function readAnchorNumber(
  value:
    | { toNumber?: () => number; toString?: () => string }
    | number
    | bigint
    | null
    | undefined,
  fallback = 0
) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "bigint") return Number(value);
  if (typeof value.toNumber === "function") return value.toNumber();
  if (typeof value.toString === "function") {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function readPubkey(
  value: { toBase58?: () => string; toString?: () => string } | string | null | undefined,
  fallback = ""
) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  if (typeof value.toBase58 === "function") return value.toBase58();
  if (typeof value.toString === "function") return value.toString();
  return fallback;
}

function readEnumName(value: Record<string, unknown> | null | undefined) {
  if (!value || typeof value !== "object") return "unknown";
  const keys = Object.keys(value);
  return keys[0] ?? "unknown";
}

async function main() {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const dummyWallet = {
    publicKey: Keypair.generate().publicKey,
    signTransaction: async <T,>(tx: T) => tx,
    signAllTransactions: async <T,>(txs: T[]) => txs,
  };

  const provider = new anchor.AnchorProvider(connection, dummyWallet as never, {
    commitment: "confirmed",
  });

  const program = new anchor.Program(
    {
      ...(idl as anchor.Idl),
      address: WANNABET_ESCROW_PROGRAM_ID.toBase58(),
    } as anchor.Idl,
    provider
  );

  const rows = await (
    program.account as unknown as {
      betSportsMetadata: {
        all: () => Promise<
          Array<{
            publicKey: { toBase58: () => string };
            account: Record<string, unknown>;
          }>
        >;
      };
    }
  ).betSportsMetadata.all();

  const mapped = rows.map((row) => {
    const account = row.account as Record<string, unknown> & {
      bet: { toBase58?: () => string; toString?: () => string } | string;
      provider: Record<string, unknown> | null;
      sport: Record<string, unknown> | null;
      league: Record<string, unknown> | null;
      marketType: Record<string, unknown> | null;
      providerEventId:
        | { toNumber?: () => number; toString?: () => string }
        | number
        | bigint
        | null
        | undefined;
      homeTeamId:
        | { toNumber?: () => number; toString?: () => string }
        | number
        | bigint
        | null
        | undefined;
      awayTeamId:
        | { toNumber?: () => number; toString?: () => string }
        | number
        | bigint
        | null
        | undefined;
      eventStartTs:
        | { toNumber?: () => number; toString?: () => string }
        | number
        | bigint
        | null
        | undefined;
    };

    return {
      metadataPubkey: row.publicKey.toBase58(),
      betPubkey: readPubkey(account.bet),
      provider: readEnumName(account.provider),
      sport: readEnumName(account.sport),
      league: readEnumName(account.league),
      marketType: readEnumName(account.marketType),
      providerEventId: String(readAnchorNumber(account.providerEventId, 0)),
      homeTeamId: String(readAnchorNumber(account.homeTeamId, 0)),
      awayTeamId: String(readAnchorNumber(account.awayTeamId, 0)),
      eventStartTs: readAnchorNumber(account.eventStartTs, 0),
    };
  });

  console.log(JSON.stringify(mapped, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
