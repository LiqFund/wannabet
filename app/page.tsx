'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as anchor from '@coral-xyz/anchor';
import { useWallet } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import idl from '@/lib/idl/wannabet_escrow.json';
import { formatUSDC } from '@/lib/format';
import {
  SOLANA_RPC_URL,
  WANNABET_ESCROW_PROGRAM_ID,
  WANNABET_DEVNET_TEST_MINT,
} from '@/lib/solana';

type RealBet = {
  pubkey: string;
  creator: string;
  accepter: string;
  mint: string;
  creatorAmountUi: number;
  accepterAmountRequiredUi: number;
  accepterAmountUi: number;
  expiryTs: number;
  state: string;
  creatorSide: number;
  accepterSide: number;
  winnerSide: number;
  betId: string;
};

const DEFAULT_PUBKEY = PublicKey.default.toBase58();
const CURRENT_BET_ACCOUNT_SIZE = 190;

function getUserDisplay(value: string) {
  return value.slice(0, 5);
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

function getStateLabel(state: Record<string, unknown> | null | undefined) {
  if (!state || typeof state !== 'object') return 'UNKNOWN';
  if ('open' in state) return 'OPEN';
  if ('locked' in state) return 'LOCKED';
  if ('cancelled' in state) return 'CANCELLED';
  if ('resolved' in state) return 'RESOLVED';
  return 'UNKNOWN';
}

function formatStakeRatio(left: number, right: number) {
  if (left <= 0 || right <= 0) return 'N/A';

  const larger = Math.max(left, right);
  const smaller = Math.min(left, right);
  const ratio = larger / smaller;

  if (Number.isInteger(ratio)) {
    return `${ratio}:1`;
  }

  return `${ratio.toFixed(2).replace(/\.00$/, '')}:1`;
}

function readAnchorNumberLike(
  value: { toNumber?: () => number; toString?: () => string } | null | undefined,
  fallback = 0
) {
  if (!value) return fallback;

  if (typeof value.toNumber === 'function') {
    return value.toNumber();
  }

  if (typeof value.toString === 'function') {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function readAnchorPubkeyLike(
  value: { toBase58?: () => string; toString?: () => string } | null | undefined,
  fallback = DEFAULT_PUBKEY
) {
  if (!value) return fallback;

  if (typeof value.toBase58 === 'function') {
    return value.toBase58();
  }

  if (typeof value.toString === 'function') {
    const parsed = value.toString();
    return parsed || fallback;
  }

  return fallback;
}

export default function HomePage() {
  const { publicKey, wallet, signTransaction, signAllTransactions } = useWallet();
  const [bets, setBets] = useState<RealBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marketView, setMarketView] = useState<'AVAILABLE' | 'IN_PLAY'>('AVAILABLE');
  const [acceptingBet, setAcceptingBet] = useState('');
  const [acceptError, setAcceptError] = useState('');
  const [acceptSuccess, setAcceptSuccess] = useState('');

  const loadBets = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError('');

      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
      const dummyWallet = {
        publicKey: Keypair.generate().publicKey,
        signTransaction: async (tx: never) => tx,
        signAllTransactions: async (txs: never[]) => txs,
      };

      const provider = new anchor.AnchorProvider(connection, dummyWallet as never, {
        commitment: 'confirmed',
      });

      const program = new anchor.Program(
        {
          ...(idl as anchor.Idl),
          address: WANNABET_ESCROW_PROGRAM_ID.toBase58(),
        } as anchor.Idl,
        provider
      );

      const accounts = await (program.account as unknown as {
        bet: {
          all: (filters?: Array<{ dataSize: number }>) => Promise<unknown[]>;
        };
      }).bet.all([{ dataSize: CURRENT_BET_ACCOUNT_SIZE }]);

      const mapped: RealBet[] = accounts
        .map((item) => {
          const typedItem = item as {
            publicKey: { toBase58: () => string };
            account: Record<string, unknown>;
          };

          const account = typedItem.account as Record<string, unknown> & {
            creator?: { toBase58?: () => string; toString?: () => string } | null;
            accepter?: { toBase58?: () => string; toString?: () => string } | null;
            mint?: { toBase58?: () => string; toString?: () => string } | null;
            creatorAmount?: { toNumber?: () => number; toString?: () => string } | null;
            accepterAmountRequired?: { toNumber?: () => number; toString?: () => string } | null;
            accepterAmount?: { toNumber?: () => number; toString?: () => string } | null;
            expiryTs?: { toNumber?: () => number; toString?: () => string } | null;
            state?: Record<string, unknown> | null;
            creatorSide?: number | null;
            accepterSide?: number | null;
            winnerSide?: number | null;
            betId?: { toString?: () => string } | null;
          };

          const creatorAmountBase = readAnchorNumberLike(account.creatorAmount, 0);
          const accepterAmountRequiredBase = readAnchorNumberLike(
            account.accepterAmountRequired,
            creatorAmountBase
          );
          const accepterAmountBase = readAnchorNumberLike(account.accepterAmount, 0);
          const expiryTs = readAnchorNumberLike(account.expiryTs, 0);

          return {
            pubkey: typedItem.publicKey.toBase58(),
            creator: readAnchorPubkeyLike(account.creator),
            accepter: readAnchorPubkeyLike(account.accepter),
            mint: readAnchorPubkeyLike(account.mint),
            creatorAmountUi: creatorAmountBase / 1_000_000,
            accepterAmountRequiredUi: accepterAmountRequiredBase / 1_000_000,
            accepterAmountUi: accepterAmountBase / 1_000_000,
            expiryTs,
            state: getStateLabel(account.state),
            creatorSide: typeof account.creatorSide === 'number' ? account.creatorSide : 0,
            accepterSide: typeof account.accepterSide === 'number' ? account.accepterSide : 0,
            winnerSide: typeof account.winnerSide === 'number' ? account.winnerSide : 0,
            betId:
              account.betId && typeof account.betId.toString === 'function'
                ? account.betId.toString()
                : '0',
          };
        })
        .filter((bet) => bet.mint === WANNABET_DEVNET_TEST_MINT.toBase58())
        .sort((a, b) => b.expiryTs - a.expiryTs);

      setBets(mapped);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load devnet bets.');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadBets();

    const intervalId = window.setInterval(() => {
      void loadBets(false);
    }, 10000);

    const handleFocus = () => {
      void loadBets(false);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadBets]);

  const openBets = useMemo(
    () => bets.filter((bet) => bet.state === 'OPEN' && bet.expiryTs > Math.floor(Date.now() / 1000)),
    [bets]
  );

  const lockedBets = useMemo(
    () => bets.filter((bet) => bet.state === 'LOCKED' && bet.expiryTs > Math.floor(Date.now() / 1000)),
    [bets]
  );

  const visibleBets = marketView === 'AVAILABLE' ? openBets : lockedBets;

  const connectedWallet =
    publicKey && wallet && signTransaction && signAllTransactions
      ? {
          publicKey,
          signTransaction,
          signAllTransactions,
        }
      : null;

  function getFriendlyAcceptErrorMessage(error: unknown) {
    const raw =
      error instanceof Error
        ? `${error.name} ${error.message}`
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);

    const normalized = raw.toLowerCase();

    if (normalized.includes('insufficient funds')) {
      return 'Not enough USDC to accept this bet.';
    }

    if (
      normalized.includes('creatorcannotaccept') ||
      normalized.includes('bet creator cannot accept their own bet')
    ) {
      return 'You cannot accept your own bet. Switch to a different wallet.';
    }

    if (
      normalized.includes('amountmustmatchrequired') ||
      normalized.includes('amount must match required')
    ) {
      return 'The accept amount no longer matches the required opponent stake.';
    }

    if (normalized.includes('user rejected') || normalized.includes('rejected the request')) {
      return 'Transaction was cancelled in your wallet.';
    }

    if (normalized.includes('wallet')) {
      return 'Wallet error. Reconnect your wallet and try again.';
    }

    return 'Failed to accept bet. Please try again.';
  }

  async function handleAcceptBet(bet: RealBet) {
    setAcceptError('');
    setAcceptSuccess('');
    setAcceptingBet(bet.pubkey);

    try {
      if (!connectedWallet) {
        setAcceptError('Connect a Solana wallet first.');
        return;
      }

      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
      const provider = new anchor.AnchorProvider(connection, connectedWallet as never, {
        commitment: 'confirmed',
      });

      const program = new anchor.Program(
        {
          ...(idl as anchor.Idl),
          address: WANNABET_ESCROW_PROGRAM_ID.toBase58(),
        } as anchor.Idl,
        provider
      );

      const configPda = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        WANNABET_ESCROW_PROGRAM_ID
      )[0];

      const betPubkey = new PublicKey(bet.pubkey);

      const escrowAuthorityPda = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), betPubkey.toBuffer()],
        WANNABET_ESCROW_PROGRAM_ID
      )[0];

      const accepterAta = getAssociatedTokenAddressSync(
        WANNABET_DEVNET_TEST_MINT,
        connectedWallet.publicKey
      );

      const escrowAta = getAssociatedTokenAddressSync(
        WANNABET_DEVNET_TEST_MINT,
        escrowAuthorityPda,
        true
      );

      const amountBaseUnits = Math.floor(bet.accepterAmountRequiredUi * 1_000_000);

      const tx = await (program.methods as unknown as {
        acceptBet: (amount: anchor.BN) => {
          accounts: (args: {
            accepter: PublicKey;
            config: PublicKey;
            bet: PublicKey;
            mint: PublicKey;
            accepterAta: PublicKey;
            escrowAuthority: PublicKey;
            escrowAta: PublicKey;
            tokenProgram: PublicKey;
          }) => { rpc: () => Promise<string> };
        };
      })
        .acceptBet(new anchor.BN(amountBaseUnits))
        .accounts({
          accepter: connectedWallet.publicKey,
          config: configPda,
          bet: betPubkey,
          mint: WANNABET_DEVNET_TEST_MINT,
          accepterAta,
          escrowAuthority: escrowAuthorityPda,
          escrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setAcceptSuccess(`Bet accepted. TX: ${tx}`);
      await loadBets(false);
    } catch (err) {
      console.error(err);
      setAcceptError(getFriendlyAcceptErrorMessage(err));
    } finally {
      setAcceptingBet('');
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-panel p-5 md:flex md:items-center md:justify-between">
        <div>
          <p className="hud-label text-white/50">Live devnet orderbook</p>
          <h2 className="mt-2 text-2xl font-black uppercase">Real on-chain bets only</h2>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            Mock homepage bets removed. This page now reads real bet accounts from devnet.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
          <Link
            href="/create"
            className="rounded-md border border-neon/40 bg-neon/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-neon"
          >
            Create a bet
          </Link>
        </div>
      </section>

      {loading ? (
        <section className="rounded-xl border border-white/10 bg-panel p-5 text-sm text-white/70">
          Loading real devnet bets...
        </section>
      ) : null}

      {error ? (
        <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
          {error}
        </section>
      ) : null}

      {!loading && !error ? (
        <section className="rounded-xl border border-white/10 bg-panel p-3">
          <div className="inline-flex rounded-md border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={() => setMarketView('AVAILABLE')}
              className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${
                marketView === 'AVAILABLE' ? 'bg-neon/25 text-neon' : 'text-white/60 hover:text-white'
              }`}
            >
              Available ({openBets.length})
            </button>
            <button
              type="button"
              onClick={() => setMarketView('IN_PLAY')}
              className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${
                marketView === 'IN_PLAY' ? 'bg-neon/25 text-neon' : 'text-white/60 hover:text-white'
              }`}
            >
              In Play ({lockedBets.length})
            </button>
          </div>
        </section>
      ) : null}

      {!loading && !error && visibleBets.length === 0 ? (
        <section className="rounded-xl border border-white/10 bg-panel p-5 text-sm text-white/70">
          {marketView === 'AVAILABLE'
            ? 'No available on-chain bets found on devnet.'
            : 'No in-play on-chain bets found on devnet.'}
        </section>
      ) : null}

      {acceptError ? (
        <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
          {acceptError}
        </section>
      ) : null}

      {acceptSuccess ? (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-200">
          {acceptSuccess}
        </section>
      ) : null}

      {!loading && !error && visibleBets.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {visibleBets.map((bet) => {
            const displayedOpponentStake =
              bet.state === 'OPEN' ? bet.accepterAmountRequiredUi : bet.accepterAmountUi;
            const totalPot = bet.creatorAmountUi + displayedOpponentStake;
            const oddsLabel = formatStakeRatio(bet.creatorAmountUi, displayedOpponentStake);
            const creatorDisplay = getUserDisplay(bet.creator);
            const opponentDisplay =
              bet.state === 'OPEN' || bet.accepter === DEFAULT_PUBKEY
                ? 'Open'
                : getUserDisplay(bet.accepter);

            return (
              <article
                key={bet.pubkey}
                className="bet-card hud-card flex h-full flex-col rounded-md border border-white/10 bg-panel p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45">
                      Matchup
                    </p>
                    <p className="truncate text-xs font-semibold tracking-[0.04em] text-white/90">
                      <span>{creatorDisplay}</span> <span className="text-white/45">vs</span>{' '}
                      <span>{opponentDisplay}</span>
                    </p>
                  </div>
                  <span
                    className={
                      bet.state === 'LOCKED'
                        ? 'rounded-md border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-red-200'
                        : 'rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-200'
                    }
                  >
                    {bet.state}
                  </span>
                </div>

                <p className="mt-3 text-3xl font-black text-white">{formatUSDC(totalPot)}</p>
                <p className="mt-2 text-sm text-white/80">Devnet escrow bet</p>
                <Link
                  href={`/bets/${bet.pubkey}`}
                  className="mt-2 inline-flex text-xs font-semibold uppercase tracking-[0.08em] text-neon transition hover:text-white"
                >
                  View details →
                </Link>

                <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-2.5">
                  <div className="grid grid-cols-[1fr_auto] gap-y-1 text-[11px] uppercase tracking-[0.08em]">
                    <p className="text-white/50">Stake ratio</p>
                    <span className="rounded-full border border-sky-400/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-300">
                      {oddsLabel}
                    </span>

                    <p className="text-white/50">Creator stake</p>
                    <p className="font-semibold text-white/85">{formatUSDC(bet.creatorAmountUi)}</p>

                    {bet.state === 'OPEN' ? (
                      <>
                        <p className="text-white/50">Opponent stake required</p>
                        <p className="font-semibold text-white">
                          {formatUSDC(bet.accepterAmountRequiredUi)}
                        </p>

                        <p className="text-white/50">Potential pot</p>
                        <p className="font-semibold text-white">{formatUSDC(totalPot)}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-white/50">Opponent stake</p>
                        <p className="font-semibold text-white/85">
                          {formatUSDC(bet.accepterAmountUi)}
                        </p>

                        <p className="text-white/50">Total pot</p>
                        <p className="font-semibold text-white">{formatUSDC(totalPot)}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between text-xs text-white/55">
                    <span>TIME REMAINING</span>
                    <span className="text-sm text-white/80">{formatRemaining(bet.expiryTs)}</span>
                  </div>
                </div>

                {bet.state === 'OPEN' ? (
                  <button
                    type="button"
                    onClick={() => void handleAcceptBet(bet)}
                    disabled={acceptingBet === bet.pubkey}
                    className="mt-3 rounded-md border border-neon/50 bg-neon/25 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.09em] text-neon transition hover:bg-neon/35 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {acceptingBet === bet.pubkey
                      ? 'ACCEPTING...'
                      : `ACCEPT BET • ${formatUSDC(bet.accepterAmountRequiredUi)}`}
                  </button>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}