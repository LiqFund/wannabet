import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { notFound } from 'next/navigation';
import idl from '@/lib/idl/wannabet_escrow.json';
import { formatDateUtc, formatUSDC, shortAddress } from '@/lib/format';
import { SOLANA_RPC_URL, WANNABET_ESCROW_PROGRAM_ID, WANNABET_DEVNET_TEST_MINT } from '@/lib/solana';

export const dynamic = 'force-dynamic';

type RealBet = {
  pubkey: string;
  creator: string;
  accepter: string;
  mint: string;
  creatorAmountUi: number;
  accepterAmountUi: number;
  expiryTs: number;
  state: string;
  creatorSide: number;
  accepterSide: number;
  winnerSide: number;
  betId: string;
};

function getStateLabel(state: Record<string, unknown>) {
  if (state.open) return 'OPEN';
  if (state.locked) return 'LOCKED';
  if (state.cancelled) return 'CANCELLED';
  if (state.resolved) return 'RESOLVED';
  return 'UNKNOWN';
}

function formatExpiryUtc(expiryTs: number) {
  return formatDateUtc(new Date(expiryTs * 1000));
}

async function getRealBet(pubkey: string): Promise<RealBet | null> {
  try {
    const betPubkey = new PublicKey(pubkey);

    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const dummyWallet = {
      publicKey: Keypair.generate().publicKey,
      signTransaction: async (tx: never) => tx,
      signAllTransactions: async (txs: never[]) => txs
    };

    const provider = new anchor.AnchorProvider(connection, dummyWallet as never, {
      commitment: 'confirmed'
    });

    const program = new anchor.Program(
      {
        ...(idl as anchor.Idl),
        address: WANNABET_ESCROW_PROGRAM_ID.toBase58()
      } as anchor.Idl,
      provider
    );

    const account = await (program.account as unknown as {
      bet: { fetchNullable: (address: PublicKey) => Promise<Record<string, unknown> | null> };
    }).bet.fetchNullable(betPubkey);

    if (!account) {
      return null;
    }

    const typed = account as Record<string, unknown> & {
      creator: { toBase58: () => string };
      accepter: { toBase58: () => string };
      mint: { toBase58: () => string };
      creatorAmount: { toNumber?: () => number; toString: () => string };
      accepterAmount: { toNumber?: () => number; toString: () => string };
      expiryTs: { toNumber?: () => number; toString: () => string };
      state: Record<string, unknown>;
      creatorSide: number;
      accepterSide: number;
      winnerSide: number;
      betId: { toString: () => string };
    };

    const creatorAmountBase =
      typeof typed.creatorAmount?.toNumber === 'function'
        ? typed.creatorAmount.toNumber()
        : Number(typed.creatorAmount.toString());

    const accepterAmountBase =
      typeof typed.accepterAmount?.toNumber === 'function'
        ? typed.accepterAmount.toNumber()
        : Number(typed.accepterAmount.toString());

    const expiryTs =
      typeof typed.expiryTs?.toNumber === 'function'
        ? typed.expiryTs.toNumber()
        : Number(typed.expiryTs.toString());

    const bet: RealBet = {
      pubkey,
      creator: typed.creator.toBase58(),
      accepter: typed.accepter.toBase58(),
      mint: typed.mint.toBase58(),
      creatorAmountUi: creatorAmountBase / 1_000_000,
      accepterAmountUi: accepterAmountBase / 1_000_000,
      expiryTs,
      state: getStateLabel(typed.state),
      creatorSide: typed.creatorSide,
      accepterSide: typed.accepterSide,
      winnerSide: typed.winnerSide,
      betId: typed.betId.toString()
    };

    if (bet.mint !== WANNABET_DEVNET_TEST_MINT.toBase58()) {
      return null;
    }

    return bet;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: `Bet ${params.id.slice(0, 8)}... | wannabet.you`
  };
}

export default async function BetDetailPage({ params }: { params: { id: string } }) {
  const bet = await getRealBet(params.id);

  if (!bet) {
    notFound();
  }

  const totalPot = bet.creatorAmountUi + bet.accepterAmountUi;
  const isMatched = bet.accepter !== PublicKey.default.toBase58() && bet.accepterAmountUi > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-white/15 bg-panel/95 p-6 shadow-glow">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">Real devnet bet</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{shortAddress(bet.pubkey)}</h1>
        <p className="mt-2 text-sm text-white/75">
          Live on-chain escrow account loaded directly from devnet.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-white/15 bg-panel/95 p-5 shadow-magenta transition hover:-translate-y-0.5 hover:border-white/20">
          <h2 className="font-semibold tracking-tight text-neon">Bet details</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>State: {bet.state}</li>
            <li>Bet account: {bet.pubkey}</li>
            <li>Internal bet id: {bet.betId}</li>
            <li>Mint: {shortAddress(bet.mint)}</li>
            <li>Creator: {shortAddress(bet.creator)}</li>
            <li>Taker: {isMatched ? shortAddress(bet.accepter) : 'Unfilled'}</li>
            <li>Creator escrow: {formatUSDC(bet.creatorAmountUi)}</li>
            <li>Taker escrow: {formatUSDC(bet.accepterAmountUi)}</li>
            <li>Total pot: {formatUSDC(totalPot)}</li>
          </ul>
        </section>

        <section className="rounded-lg border border-white/15 bg-panel/95 p-5 shadow-magenta transition hover:-translate-y-0.5 hover:border-white/20">
          <h2 className="font-semibold tracking-tight text-neon">Settlement</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>Expires: {formatExpiryUtc(bet.expiryTs)}</li>
            <li>Creator side: {bet.creatorSide}</li>
            <li>Taker side: {bet.accepterSide}</li>
            <li>Winner side: {bet.winnerSide}</li>
            <li>Matched: {isMatched ? 'Yes' : 'No'}</li>
          </ul>
          <p className="mt-4 rounded-md border border-magenta/40 bg-magenta/10 p-3 text-xs font-medium tracking-wide text-magenta">
            This page now reads live devnet account state, not mock catalog data.
          </p>
        </section>
      </div>
    </div>
  );
}
