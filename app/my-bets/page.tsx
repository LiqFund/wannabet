'use client';

import * as anchor from '@coral-xyz/anchor';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import idl from '@/lib/idl/wannabet_escrow.json';
import { formatUSDC, shortAddress } from '@/lib/format';
import { SOLANA_RPC_URL, WANNABET_DEVNET_TEST_MINT, WANNABET_ESCROW_PROGRAM_ID } from '@/lib/solana';

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

function getFriendlyCancelErrorMessage(error: unknown) {
  const raw =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);

  const normalized = raw.toLowerCase();

  if (normalized.includes('user rejected') || normalized.includes('rejected the request')) {
    return 'Transaction was cancelled in your wallet.';
  }

  if (normalized.includes('wallet')) {
    return 'Wallet error. Reconnect your wallet and try again.';
  }

  return 'Failed to cancel bet. Please try again.';
}

export default function MyBetsPage() {
  const { publicKey, wallet, signTransaction, signAllTransactions } = useWallet();
  const [bets, setBets] = useState<RealBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'CREATED' | 'ACCEPTED'>('CREATED');
  const [cancellingBet, setCancellingBet] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');

  const connectedWallet =
    publicKey && wallet && signTransaction && signAllTransactions
      ? {
          publicKey,
          signTransaction,
          signAllTransactions,
        }
      : null;

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

      const accounts = await (program.account as unknown as { bet: { all: () => Promise<unknown[]> } }).bet.all();

      const mapped: RealBet[] = accounts
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
            betId: account.betId.toString(),
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

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadBets]);

  const createdByMe = useMemo(() => {
    if (!publicKey) return [];
    return bets.filter((bet) => bet.creator === publicKey.toBase58());
  }, [bets, publicKey]);

  const acceptedByMe = useMemo(() => {
    if (!publicKey) return [];
    return bets.filter((bet) => bet.accepter === publicKey.toBase58());
  }, [bets, publicKey]);

  const visibleBets = activeTab === 'CREATED' ? createdByMe : acceptedByMe;

  async function handleCancelBet(bet: RealBet) {
    setCancelError('');
    setCancelSuccess('');
    setCancellingBet(bet.pubkey);

    try {
      if (!connectedWallet) {
        setCancelError('Connect a Solana wallet first.');
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

      const creatorAta = getAssociatedTokenAddressSync(
        WANNABET_DEVNET_TEST_MINT,
        connectedWallet.publicKey
      );

      const escrowAta = getAssociatedTokenAddressSync(
        WANNABET_DEVNET_TEST_MINT,
        escrowAuthorityPda,
        true
      );

      const tx = await (program.methods as unknown as {
        cancelBet: () => {
          accounts: (args: {
            creator: PublicKey;
            config: PublicKey;
            bet: PublicKey;
            mint: PublicKey;
            creatorAta: PublicKey;
            escrowAuthority: PublicKey;
            escrowAta: PublicKey;
            tokenProgram: PublicKey;
          }) => { rpc: () => Promise<string> };
        };
      })
        .cancelBet()
        .accounts({
          creator: connectedWallet.publicKey,
          config: configPda,
          bet: betPubkey,
          mint: WANNABET_DEVNET_TEST_MINT,
          creatorAta,
          escrowAuthority: escrowAuthorityPda,
          escrowAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setCancelSuccess(`Bet cancelled. TX: ${tx}`);
      void loadBets(false);
    } catch (err) {
      console.error(err);
      setCancelError(getFriendlyCancelErrorMessage(err));
    } finally {
      setCancellingBet('');
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-panel p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">Live devnet wallet view</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">My Bets</h1>
        <p className="mt-2 text-sm text-white/70">
          Track bets you created and bets you accepted.
        </p>
      </section>

      {!publicKey ? (
        <section className="rounded-xl border border-white/10 bg-panel p-5 text-sm text-white/70">
          Connect your wallet to view your bets.
        </section>
      ) : null}

      {loading ? (
        <section className="rounded-xl border border-white/10 bg-panel p-5 text-sm text-white/70">
          Loading your devnet bets...
        </section>
      ) : null}

      {error ? (
        <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
          {error}
        </section>
      ) : null}

      {cancelError ? (
        <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
          {cancelError}
        </section>
      ) : null}

      {cancelSuccess ? (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-200">
          {cancelSuccess}
        </section>
      ) : null}

      {publicKey && !loading && !error ? (
        <section className="rounded-xl border border-white/10 bg-panel p-3">
          <div className="inline-flex rounded-md border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('CREATED')}
              className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${
                activeTab === 'CREATED'
                  ? 'bg-neon/25 text-neon'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Created by me ({createdByMe.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ACCEPTED')}
              className={`rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${
                activeTab === 'ACCEPTED'
                  ? 'bg-neon/25 text-neon'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Accepted by me ({acceptedByMe.length})
            </button>
          </div>
        </section>
      ) : null}

      {publicKey && !loading && !error && visibleBets.length === 0 ? (
        <section className="rounded-xl border border-white/10 bg-panel p-5 text-sm text-white/70">
          {activeTab === 'CREATED' ? 'You have not created any bets yet.' : 'You have not accepted any bets yet.'}
        </section>
      ) : null}

      {publicKey && !loading && !error && visibleBets.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleBets.map((bet) => {
            const totalPot = bet.creatorAmountUi + bet.accepterAmountUi;
            const oddsLabel =
              bet.accepterAmountUi > 0
                ? `${(bet.creatorAmountUi / bet.accepterAmountUi).toFixed(2).replace(/\.00$/, '')}-1`
                : '1-1';
            const canCancel =
              activeTab === 'CREATED' &&
              bet.state === 'OPEN' &&
              bet.expiryTs > Math.floor(Date.now() / 1000);

            return (
              <article
                key={bet.pubkey}
                className="flex h-full flex-col rounded-md border border-white/10 bg-panel p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45">
                      {activeTab === 'CREATED' ? 'Created by me' : 'Accepted by me'}
                    </p>
                  </div>
                  <span
                    className={
                      bet.state === 'LOCKED'
                        ? 'rounded-md border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-red-200'
                        : bet.state === 'OPEN'
                          ? 'rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-200'
                          : 'rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70'
                    }
                  >
                    {bet.state}
                  </span>
                </div>

                <p className="mt-3 text-3xl font-black text-white">{formatUSDC(totalPot)}</p>

                <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3">
                  <div className="grid grid-cols-[1fr_auto] gap-y-1 text-[11px] uppercase tracking-[0.08em]">
                    <p className="text-white/50">Odds</p>
                    <span className="rounded-full border border-sky-400/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-300">
                      Odds {oddsLabel}
                    </span>

                    <p className="text-white/50">Opponent</p>
                    <p className="font-semibold text-white/85">
                      {bet.accepterAmountUi > 0 ? shortAddress(bet.accepter) : 'Unfilled'}
                    </p>

                    <p className="text-white/50">Creator stake</p>
                    <p className="font-semibold text-white/85">{formatUSDC(bet.creatorAmountUi)}</p>

                    <p className="text-white/50">Opponent stake</p>
                    <p className="font-semibold text-white/85">{formatUSDC(bet.accepterAmountUi)}</p>

                    <p className="text-white/50">Time remaining</p>
                    <p className="font-semibold text-white/85">{formatRemaining(bet.expiryTs)}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/bets/${bet.pubkey}`}
                    className="inline-flex rounded-md border border-neon/50 bg-neon/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-neon transition hover:bg-neon/30"
                  >
                    View details
                  </Link>

                  {canCancel ? (
                    <button
                      type="button"
                      onClick={() => void handleCancelBet(bet)}
                      disabled={cancellingBet === bet.pubkey}
                      className="inline-flex rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancellingBet === bet.pubkey ? 'Cancelling...' : 'Cancel bet'}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
