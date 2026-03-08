import * as anchor from '@coral-xyz/anchor';
import Link from 'next/link';
import { Connection, Keypair } from '@solana/web3.js';
import idl from '@/lib/idl/wannabet_escrow.json';
import { formatUSDC, shortAddress } from '@/lib/format';
import { SOLANA_RPC_URL, WANNABET_ESCROW_PROGRAM_ID, WANNABET_DEVNET_TEST_MINT } from '@/lib/solana';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Browse bets | wannabet.you',
  openGraph: { title: 'Browse bets | wannabet.you', description: 'Live devnet on-chain bets.' }
};

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

function formatRemaining(expiryTs: number) {
  const now = Math.floor(Date.now() / 1000);
  const diff = expiryTs - now;

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / 86400);
  if (days > 0) return `${days}D`;

  const hours = Math.floor(diff / 3600);
  if (hours > 0) return `${hours}H`;

  const minutes = Math.floor(diff / 60);
  if (minutes > 0) return `${minutes}M`;

  return `${diff}S`;
}

async function getRealBets(): Promise<RealBet[]> {
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

  const accounts = await (program.account as unknown as { bet: { all: () => Promise<unknown[]> } }).bet.all();

  return accounts
    .map((item) => {
      const typedItem = item as {
        publicKey: { toBase58: () => string };
        account: Record<string, unknown>;
      };

      const account = typedItem.account as Record<string, unknown> & {
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
        typeof account.creatorAmount?.toNumber === 'function'
          ? account.creatorAmount.toNumber()
          : Number(account.creatorAmount.toString());

      const accepterAmountBase =
        typeof account.accepterAmount?.toNumber === 'function'
          ? account.accepterAmount.toNumber()
          : Number(account.accepterAmount.toString());

      const expiryTs =
        typeof account.expiryTs?.toNumber === 'function'
          ? account.expiryTs.toNumber()
          : Number(account.expiryTs.toString());

      return {
        pubkey: typedItem.publicKey.toBase58(),
        creator: account.creator.toBase58(),
        accepter: account.accepter.toBase58(),
        mint: account.mint.toBase58(),
        creatorAmountUi: creatorAmountBase / 1_000_000,
        accepterAmountUi: accepterAmountBase / 1_000_000,
        expiryTs,
        state: getStateLabel(account.state),
        creatorSide: account.creatorSide,
        accepterSide: account.accepterSide,
        winnerSide: account.winnerSide,
        betId: account.betId.toString()
      };
    })
    .filter((bet) => bet.mint === WANNABET_DEVNET_TEST_MINT.toBase58())
    .filter((bet) => bet.expiryTs > Math.floor(Date.now() / 1000))
    .filter((bet) => bet.state === 'OPEN' || bet.state === 'LOCKED')
    .sort((a, b) => b.expiryTs - a.expiryTs);
}

export default async function BetsPage() {
  const bets = await getRealBets();
  const openBets = bets.filter((bet) => bet.state === 'OPEN');
  const lockedBets = bets.filter((bet) => bet.state === 'LOCKED');

  const renderBetCard = (bet: RealBet) => {
    const totalPot = bet.creatorAmountUi + bet.accepterAmountUi;
    const isMatched = bet.accepterAmountUi > 0;
    const badgeClass =
      bet.state === 'LOCKED'
        ? 'rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-200'
        : 'rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-200';

    return (
      <article
        key={bet.pubkey}
        className="rounded-lg border border-white/15 bg-panel/95 p-5 shadow-magenta transition hover:-translate-y-0.5 hover:border-white/20"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">Bet account</p>
            <h2 className="mt-1 text-lg font-bold text-white">{shortAddress(bet.pubkey)}</h2>
          </div>
          <span className={badgeClass}>{bet.state}</span>
        </div>

        <p className="mt-4 text-3xl font-black text-white">{formatUSDC(totalPot)}</p>
        <p className="mt-2 text-sm text-white/75">Creator {shortAddress(bet.creator)}</p>
        <p className="mt-1 text-sm text-white/75">Taker {isMatched ? shortAddress(bet.accepter) : 'Unfilled'}</p>

        <div className="mt-4 space-y-2 text-sm text-white/80">
          <p>Creator escrow: {formatUSDC(bet.creatorAmountUi)}</p>
          <p>Taker escrow: {formatUSDC(bet.accepterAmountUi)}</p>
          <p>Time remaining: {formatRemaining(bet.expiryTs)}</p>
        </div>

        <Link
          href={`/bets/${bet.pubkey}`}
          className="mt-4 inline-flex rounded-md border border-neon/50 bg-neon/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-neon transition hover:bg-neon/30"
        >
          View details
        </Link>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-panel p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">Live devnet browse</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Browse Bets</h1>
        <p className="mt-2 text-sm text-white/70">
          This page now reads real on-chain devnet bet accounts.
        </p>
      </div>

      {openBets.length === 0 && lockedBets.length === 0 ? (
        <p className="text-white/70">No active devnet bets found.</p>
      ) : null}

      {openBets.length > 0 ? (
        <section className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">Open</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Open Bets</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {openBets.map(renderBetCard)}
          </div>
        </section>
      ) : null}

      {lockedBets.length > 0 ? (
        <section className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">Matched</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Locked Bets</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {lockedBets.map(renderBetCard)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
