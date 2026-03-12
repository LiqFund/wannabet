'use client';

import * as anchor from '@coral-xyz/anchor';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import idl from '@/lib/idl/wannabet_escrow.json';
import { getWannaBetProgram } from '@/lib/anchor';
import { formatUSDC, shortAddress } from '@/lib/format';
import {
  SOLANA_RPC_URL,
  WANNABET_DEVNET_TEST_MINT,
  WANNABET_ESCROW_PROGRAM_ID,
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
  winnerSide: number | null;
  resolutionStatus: string;
  payoutClaimed: boolean;
  betId: string;
};

type AnchorNumberLike =
  | { toNumber?: () => number; toString?: () => string }
  | number
  | bigint
  | null
  | undefined;

type AnchorPubkeyLike =
  | { toBase58?: () => string; toString?: () => string }
  | string
  | null
  | undefined;

type ConfigAccountShape = {
  feeVault: PublicKey | { toBase58: () => string } | string;
};

const BET_ACCOUNT_DISCRIMINATOR_BASE58 = anchor.utils.bytes.bs58.encode(
  Uint8Array.from([147, 23, 35, 59, 15, 75, 155, 32])
);

const BET_CREATOR_OFFSET = 8;
const BET_ACCEPTER_OFFSET = 40;

function getStateLabel(state: Record<string, unknown> | null | undefined) {
  if (!state || typeof state !== 'object') return 'UNKNOWN';
  if ('open' in state) return 'OPEN';
  if ('locked' in state) return 'LOCKED';
  if ('cancelled' in state) return 'CANCELLED';
  if ('resolved' in state) return 'RESOLVED';
  return 'UNKNOWN';
}

function getResolutionStatusLabel(status: Record<string, unknown> | null | undefined) {
  if (!status || typeof status !== 'object') return 'UNKNOWN';
  if ('pending' in status) return 'PENDING';
  if ('resolved' in status) return 'RESOLVED';
  if ('voided' in status) return 'VOIDED';
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

function readAnchorNumberLike(value: AnchorNumberLike, fallback = 0) {
  if (value === null || value === undefined) return fallback;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

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
  value: AnchorPubkeyLike,
  fallback = PublicKey.default.toBase58()
) {
  if (!value) return fallback;

  if (typeof value === 'string') {
    return value || fallback;
  }

  if (typeof value.toBase58 === 'function') {
    return value.toBase58();
  }

  if (typeof value.toString === 'function') {
    const parsed = value.toString();
    return parsed || fallback;
  }

  return fallback;
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

function getFriendlyClaimErrorMessage(error: unknown) {
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

  return 'Failed to claim winnings. Please try again.';
}

function getDummyProgram(connection: Connection) {
  const dummyWallet = {
    publicKey: Keypair.generate().publicKey,
    signTransaction: async <T,>(tx: T) => tx,
    signAllTransactions: async <T,>(txs: T[]) => txs,
  };

  const provider = new anchor.AnchorProvider(connection, dummyWallet as never, {
    commitment: 'confirmed',
  });

  return new anchor.Program(
    {
      ...(idl as anchor.Idl),
      address: WANNABET_ESCROW_PROGRAM_ID.toBase58(),
    } as anchor.Idl,
    provider
  );
}

function mapFetchedBet(
  pubkey: PublicKey,
  account: Record<string, unknown>
): RealBet | null {
  const typedAccount = account as Record<string, unknown> & {
    creator?: AnchorPubkeyLike;
    accepter?: AnchorPubkeyLike;
    mint?: AnchorPubkeyLike;
    creatorAmount?: AnchorNumberLike;
    accepterAmountRequired?: AnchorNumberLike;
    accepterAmount?: AnchorNumberLike;
    expiryTs?: AnchorNumberLike;
    state?: Record<string, unknown> | null;
    resolutionStatus?: Record<string, unknown> | null;
    creatorSide?: AnchorNumberLike;
    accepterSide?: AnchorNumberLike;
    winnerSide?: AnchorNumberLike;
    payoutClaimed?: boolean | null;
    betId?: { toString?: () => string } | string | null;
  };

  const creatorAmountBase = readAnchorNumberLike(typedAccount.creatorAmount, 0);
  const accepterAmountRequiredBase = readAnchorNumberLike(
    typedAccount.accepterAmountRequired,
    creatorAmountBase
  );
  const accepterAmountBase = readAnchorNumberLike(typedAccount.accepterAmount, 0);
  const expiryTs = readAnchorNumberLike(typedAccount.expiryTs, 0);
  const winnerSideRaw = readAnchorNumberLike(typedAccount.winnerSide, -1);

  const mappedBet: RealBet = {
    pubkey: pubkey.toBase58(),
    creator: readAnchorPubkeyLike(typedAccount.creator),
    accepter: readAnchorPubkeyLike(typedAccount.accepter),
    mint: readAnchorPubkeyLike(typedAccount.mint),
    creatorAmountUi: creatorAmountBase / 1_000_000,
    accepterAmountRequiredUi: accepterAmountRequiredBase / 1_000_000,
    accepterAmountUi: accepterAmountBase / 1_000_000,
    expiryTs,
    state: getStateLabel(typedAccount.state),
    creatorSide: readAnchorNumberLike(typedAccount.creatorSide, 0),
    accepterSide: readAnchorNumberLike(typedAccount.accepterSide, 0),
    winnerSide: winnerSideRaw >= 0 ? winnerSideRaw : null,
    resolutionStatus: getResolutionStatusLabel(typedAccount.resolutionStatus),
    payoutClaimed: Boolean(typedAccount.payoutClaimed),
    betId:
      typedAccount.betId &&
      typeof typedAccount.betId === 'object' &&
      typeof typedAccount.betId.toString === 'function'
        ? typedAccount.betId.toString()
        : typeof typedAccount.betId === 'string'
          ? typedAccount.betId
          : '0',
  };

  if (mappedBet.mint !== WANNABET_DEVNET_TEST_MINT.toBase58()) {
    return null;
  }

  return mappedBet;
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
  const [claimingBet, setClaimingBet] = useState('');
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');

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
      if (!publicKey) {
        setBets([]);
        setError('');
        if (showLoader) {
          setLoading(false);
        }
        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      setError('');

      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
      const program = getDummyProgram(connection);
      const walletBase58 = publicKey.toBase58();

      const [creatorAccounts, accepterAccounts] = await Promise.all([
        connection.getProgramAccounts(WANNABET_ESCROW_PROGRAM_ID, {
          commitment: 'confirmed',
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: BET_ACCOUNT_DISCRIMINATOR_BASE58,
              },
            },
            {
              memcmp: {
                offset: BET_CREATOR_OFFSET,
                bytes: walletBase58,
              },
            },
          ],
        }),
        connection.getProgramAccounts(WANNABET_ESCROW_PROGRAM_ID, {
          commitment: 'confirmed',
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: BET_ACCOUNT_DISCRIMINATOR_BASE58,
              },
            },
            {
              memcmp: {
                offset: BET_ACCEPTER_OFFSET,
                bytes: walletBase58,
              },
            },
          ],
        }),
      ]);

      const uniquePubkeys = Array.from(
        new Set(
          [...creatorAccounts, ...accepterAccounts].map(({ pubkey }) => pubkey.toBase58())
        )
      );

      const fetched = await Promise.all(
        uniquePubkeys.map(async (pubkeyBase58) => {
          try {
            const pubkey = new PublicKey(pubkeyBase58);
            const account = await (program.account as unknown as {
              bet: {
                fetchNullable: (address: PublicKey) => Promise<Record<string, unknown> | null>;
              };
            }).bet.fetchNullable(pubkey);

            if (!account) {
              return null;
            }

            return mapFetchedBet(pubkey, account);
          } catch (innerErr) {
            console.error('Skipping unreadable bet account:', pubkeyBase58, innerErr);
            return null;
          }
        })
      );

      const mapped = fetched
        .filter((bet): bet is RealBet => bet !== null)
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
  }, [publicKey]);

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

  async function handleClaimWinnings(bet: RealBet) {
    setClaimError('');
    setClaimSuccess('');
    setClaimingBet(bet.pubkey);

    try {
      if (!connectedWallet) {
        setClaimError('Connect a Solana wallet first.');
        return;
      }

      const program = getWannaBetProgram({
        publicKey: connectedWallet.publicKey,
        signTransaction: connectedWallet.signTransaction,
        signAllTransactions: connectedWallet.signAllTransactions,
      });

      const betPubkey = new PublicKey(bet.pubkey);

      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        WANNABET_ESCROW_PROGRAM_ID
      );

      const [escrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), betPubkey.toBuffer()],
        WANNABET_ESCROW_PROGRAM_ID
      );

      const claimantAta = getAssociatedTokenAddressSync(
        WANNABET_DEVNET_TEST_MINT,
        connectedWallet.publicKey
      );

      const escrowAta = getAssociatedTokenAddressSync(
        WANNABET_DEVNET_TEST_MINT,
        escrowAuthorityPda,
        true
      );

      const config = await (
        program.account as unknown as {
          config: {
            fetch: (address: PublicKey) => Promise<ConfigAccountShape>;
          };
        }
      ).config.fetch(configPda);

      const feeVault =
        config.feeVault instanceof PublicKey
          ? config.feeVault
          : new PublicKey(
              typeof config.feeVault === 'string'
                ? config.feeVault
                : config.feeVault.toBase58()
            );

      const tx = await program.methods
        .claimWinnings()
        .accounts({
          claimant: connectedWallet.publicKey,
          config: configPda,
          bet: betPubkey,
          mint: WANNABET_DEVNET_TEST_MINT,
          claimantAta,
          escrowAuthority: escrowAuthorityPda,
          escrowAta,
          feeVault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setClaimSuccess(`Winnings claimed. TX: ${tx}`);
      void loadBets(false);
    } catch (err) {
      console.error(err);
      setClaimError(getFriendlyClaimErrorMessage(err));
    } finally {
      setClaimingBet('');
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-panel p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
          Live devnet wallet view
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">My Bets</h1>
        <p className="mt-2 text-sm text-white/70">Track bets you created and bets you accepted.</p>
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

      {claimError ? (
        <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
          {claimError}
        </section>
      ) : null}

      {claimSuccess ? (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-200">
          {claimSuccess}
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
          {activeTab === 'CREATED'
            ? 'You have not created any bets yet.'
            : 'You have not accepted any bets yet.'}
        </section>
      ) : null}

      {publicKey && !loading && !error && visibleBets.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleBets.map((bet) => {
            const isAcceptedView = activeTab === 'ACCEPTED';
            const displayedOpponentStake =
              bet.state === 'OPEN' ? bet.accepterAmountRequiredUi : bet.accepterAmountUi;
            const totalPot = bet.creatorAmountUi + displayedOpponentStake;
            const oddsLabel = formatStakeRatio(
              bet.creatorAmountUi,
              displayedOpponentStake > 0 ? displayedOpponentStake : bet.accepterAmountRequiredUi
            );
            const canCancel = activeTab === 'CREATED' && bet.state === 'OPEN';

            const opponentDisplay = isAcceptedView
              ? shortAddress(bet.creator)
              : bet.accepterAmountUi > 0
                ? shortAddress(bet.accepter)
                : 'Unfilled';

            const yourStakeAmount = isAcceptedView
              ? bet.accepterAmountUi > 0
                ? bet.accepterAmountUi
                : bet.accepterAmountRequiredUi
              : bet.creatorAmountUi;

            const opponentStakeAmount =
              bet.state === 'OPEN'
                ? bet.accepterAmountRequiredUi
                : isAcceptedView
                  ? bet.creatorAmountUi
                  : bet.accepterAmountUi;

            const opponentStakeLabel =
              bet.state === 'OPEN' ? 'Opponent stake required' : 'Opponent stake';

            const isWinner =
              bet.state === 'RESOLVED' &&
              bet.winnerSide !== null &&
              ((isAcceptedView && bet.winnerSide === bet.accepterSide) ||
                (!isAcceptedView && bet.winnerSide === bet.creatorSide));

            const isLoser =
              bet.state === 'RESOLVED' &&
              bet.winnerSide !== null &&
              !isWinner;

            const canClaimWinnings =
              isWinner &&
              bet.resolutionStatus === 'RESOLVED' &&
              bet.payoutClaimed === false;

            const showClaimed =
              isWinner &&
              bet.resolutionStatus === 'RESOLVED' &&
              bet.payoutClaimed === true;

            const resultLabel =
              isWinner ? 'WON' : isLoser ? 'LOST' : bet.state === 'LOCKED' ? 'IN PLAY' : bet.state;

            const resultBadgeClass =
              resultLabel === 'WON'
                ? 'rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-200'
                : resultLabel === 'LOST'
                  ? 'rounded-md border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-red-200'
                  : resultLabel === 'IN PLAY'
                    ? 'rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-200'
                    : bet.state === 'OPEN'
                      ? 'rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-200'
                      : 'rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70';

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
                  <span className={resultBadgeClass}>{resultLabel}</span>
                </div>

                <p className="mt-3 text-3xl font-black text-white">{formatUSDC(totalPot)}</p>

                <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3">
                  <div className="grid grid-cols-[1fr_auto] gap-y-1 text-[11px] uppercase tracking-[0.08em]">
                    <p className="text-white/50">Odds</p>
                    <span className="rounded-full border border-sky-400/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-300">
                      Odds {oddsLabel}
                    </span>

                    <p className="text-white/50">Opponent</p>
                    <p className="font-semibold text-white/85">{opponentDisplay}</p>

                    <p className="text-white/50">Your stake</p>
                    <p className="font-semibold text-white/85">{formatUSDC(yourStakeAmount)}</p>

                    <p className="text-white/50">{opponentStakeLabel}</p>
                    <p className="font-semibold text-white/85">{formatUSDC(opponentStakeAmount)}</p>

                    <p className="text-white/50">Time remaining</p>
                    <p className="font-semibold text-white/85">{formatRemaining(bet.expiryTs)}</p>
                  </div>
                </div>

                <div className="mt-auto pt-4 flex items-end justify-between gap-2">
                  <div className="flex-shrink-0">
                    <Link
                      href={`/bets/${bet.pubkey}`}
                      className="inline-flex rounded-md border border-neon/50 bg-neon/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-neon transition hover:bg-neon/30"
                    >
                      View details
                    </Link>
                  </div>

                  <div className="ml-auto flex flex-wrap justify-end gap-2">
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

                    {canClaimWinnings ? (
                      <button
                        type="button"
                        onClick={() => void handleClaimWinnings(bet)}
                        disabled={claimingBet === bet.pubkey}
                        className="inline-flex rounded-md border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-emerald-200 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {claimingBet === bet.pubkey ? 'Claiming...' : 'Claim winnings'}
                      </button>
                    ) : null}

                    {showClaimed ? (
                      <span className="inline-flex rounded-md border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white/70">
                        Claimed
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}