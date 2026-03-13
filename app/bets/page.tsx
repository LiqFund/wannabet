import * as anchor from '@coral-xyz/anchor';
import Link from 'next/link';
import { Connection, Keypair } from '@solana/web3.js';
import idl from '@/lib/idl/wannabet_escrow.json';
import { formatUSDC, shortAddress } from '@/lib/format';
import { listBetSportsEventLinks } from '@/lib/server/sports/repository/listBetSportsEventLinks';
import { getLeagueLabel, getSportsMarketTypeLabel } from '@/lib/sports/labels';
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
  sportsMetadata: {
    league: string;
    marketType: string;
    providerEventId: string;
    eventStartTs: number;
    matchup: string | null;
  } | null;
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

  const typedProgram = program.account as unknown as {
    bet: { all: () => Promise<unknown[]> };
    betSportsMetadata: { all: () => Promise<unknown[]> };
  };

  const accounts = await typedProgram.bet.all();
  const sportsMetadataAccounts = await typedProgram.betSportsMetadata.all();

  const sportsEventLinks = await listBetSportsEventLinks(
    accounts.map((item) => {
      const typedItem = item as {
        publicKey: { toBase58: () => string };
      };

      return typedItem.publicKey.toBase58();
    })
  );

  const sportsEventLinksByBetPubkey = new Map(
    sportsEventLinks.map((link) => [
      link.betPubkey,
      `${link.awayTeamName} vs ${link.homeTeamName}`
    ] as const)
  );

  const sportsMetadataByBetPubkey = new Map(
    sportsMetadataAccounts.map((item) => {
      const typedItem = item as {
        publicKey: { toBase58: () => string };
        account: Record<string, unknown>;
      };

      const account = typedItem.account as Record<string, unknown> & {
        bet: { toBase58: () => string };
        league: Record<string, unknown>;
        marketType: Record<string, unknown>;
        providerEventId: { toString: () => string };
        eventStartTs: { toNumber?: () => number; toString: () => string };
      };

      const betPubkey = account.bet.toBase58();

      const eventStartTs =
        typeof account.eventStartTs?.toNumber === 'function'
          ? account.eventStartTs.toNumber()
          : Number(account.eventStartTs.toString());

      return [
        betPubkey,
        {
          league: getLeagueLabel(account.league),
          marketType: getSportsMarketTypeLabel(account.marketType),
          providerEventId: account.providerEventId.toString(),
          eventStartTs,
          matchup: sportsEventLinksByBetPubkey.get(betPubkey) ?? null
        }
      ] as const;
    })
  );

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

      const pubkey = typedItem.publicKey.toBase58();

      return {
        pubkey,
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
        betId: account.betId.toString(),
        sportsMetadata: sportsMetadataByBetPubkey.get(pubkey) ?? null
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

    const isSportsLinked = Boolean(bet.sportsMetadata);

    return (
      <article
        key={bet.pubkey}
        className="rounded-lg border border-white/15 bg-panel/95 p-5 shadow-magenta transition hover:-translate-y-0.5 hover:border-white/20"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
              {isSportsLinked ? 'Sports-linked bet' : 'Bet account'}
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">{shortAddress(bet.pubkey)}</h2>
          </div>
          <span className={badgeClass}>{bet.state}</span>
        </div>

        {bet.sportsMetadata ? (
          <div className="mt-4 rounded-lg border border-neon/30 bg-neon/10 px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neon/80">
              {bet.sportsMetadata.league} · {bet.sportsMetadata.marketType}
            </div>
            {bet.sportsMetadata.matchup ? (
              <div className="mt-2 text-sm font-semibold text-white">
                {bet.sportsMetadata.matchup}
              </div>
            ) : null}
            <div className="mt-2 text-xs text-white/70">
              Event start: {new Date(bet.sportsMetadata.eventStartTs * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}
            </div>
            <div className="mt-1 text-xs text-white/55">
              Provider event id: {bet.sportsMetadata.providerEventId}
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-3xl font-black text-white">{formatUSDC(totalPot)}</p>
        <p className="mt-2 text-sm text-white/75">Creator {shortAddress(bet.creator)}</p>
        <p className="mt-1 text-sm text-white/75">Taker {isMatched ? shortAddress(bet.accepter) : 'Unfilled'}</p>

        <div className="mt-4 space-y-2 text-sm text-white/80">
          <p>Creator escrow: {formatUSDC(bet.creatorAmountUi)}</p>
          <p>Taker escrow: {formatUSDC(bet.accepterAmountUi)}</p>
          <p>
            {bet.sportsMetadata
              ? 'Legacy custom expiry: ' + formatRemaining(bet.expiryTs)
              : 'Time remaining: ' + formatRemaining(bet.expiryTs)}
          </p>
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
