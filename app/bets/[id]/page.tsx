import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { notFound } from 'next/navigation';
import idl from '@/lib/idl/wannabet_escrow.json';
import BetSettlementActions from '@/components/bet-settlement-actions';
import { formatDateUtc, formatUSDC, shortAddress } from '@/lib/format';
import {
  SOLANA_RPC_URL,
  WANNABET_ESCROW_PROGRAM_ID,
  WANNABET_DEVNET_TEST_MINT
} from '@/lib/solana';

export const dynamic = 'force-dynamic';

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
  marketKind: string;
  priceSymbol: string;
  priceVenue: string;
  settlementMinuteTs: number;
  comparator: string;
  strikeE8: number;
  resolvedPriceE8: number;
  resolvedAtTs: number;
  resolutionStatus: string;
  payoutClaimed: boolean;
  creatorRefundClaimed: boolean;
  accepterRefundClaimed: boolean;
  betId: string;
};

function getStateLabel(state: Record<string, unknown>) {
  if ('open' in state) return 'OPEN';
  if ('locked' in state) return 'LOCKED';
  if ('cancelled' in state) return 'CANCELLED';
  if ('resolved' in state) return 'RESOLVED';
  return 'UNKNOWN';
}

function getResolutionStatusLabel(
  status: Record<string, unknown> | null | undefined
) {
  if (!status || typeof status !== 'object') return 'UNKNOWN';
  if ('pending' in status) return 'PENDING';
  if ('resolved' in status) return 'RESOLVED';
  if ('voided' in status) return 'VOIDED';
  return 'UNKNOWN';
}

function readEnumVariantKey(value: Record<string, unknown> | null | undefined) {
  if (!value || typeof value !== 'object') return 'unknown';
  const [key] = Object.keys(value);
  return key ?? 'unknown';
}

function getMarketKindLabel(value: Record<string, unknown> | null | undefined) {
  const key = readEnumVariantKey(value);

  if (key === 'custom') return 'CUSTOM';
  if (key === 'cryptoPriceBinary') return 'CRYPTO_PRICE_BINARY';

  return 'UNKNOWN';
}

function getPriceSymbolLabel(value: Record<string, unknown> | null | undefined) {
  const key = readEnumVariantKey(value);

  if (key === 'btcUsdt') return 'BTC/USDT';
  if (key === 'unknown') return 'UNKNOWN';

  return 'UNKNOWN';
}

function getPriceVenueLabel(value: Record<string, unknown> | null | undefined) {
  const key = readEnumVariantKey(value);

  if (key === 'binanceSpot') return 'BINANCE_SPOT';
  if (key === 'unknown') return 'UNKNOWN';

  return 'UNKNOWN';
}

function getComparatorLabel(value: Record<string, unknown> | null | undefined) {
  const key = readEnumVariantKey(value);

  if (key === 'greaterThanOrEqual') return 'ABOVE_OR_EQUAL';
  if (key === 'lessThan') return 'BELOW';
  if (key === 'unknown') return 'UNKNOWN';

  return 'UNKNOWN';
}

function formatUtcTimestamp(ts: number) {
  if (ts <= 0) return 'Not set';
  return formatDateUtc(new Date(ts * 1000));
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

function formatPriceFromE8(value: number) {
  if (value <= 0) return 'Not set';

  return (value / 100_000_000).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8
  });
}

function getWinnerLabel(bet: RealBet) {
  if (bet.winnerSide === null) return 'Not set';
  if (bet.winnerSide === bet.creatorSide) return 'Creator';
  if (bet.winnerSide === bet.accepterSide) return 'Opponent';
  return `Side ${bet.winnerSide}`;
}

function getCreatorPositionLabel(comparator: string) {
  if (comparator === 'ABOVE_OR_EQUAL') {
    return 'Creator wins if BTC closes at or above the strike.';
  }

  if (comparator === 'BELOW') {
    return 'Creator wins if BTC closes below the strike.';
  }

  return 'Custom outcome logic.';
}

function getOpponentPositionLabel(comparator: string) {
  if (comparator === 'ABOVE_OR_EQUAL') {
    return 'Opponent wins if BTC closes below the strike.';
  }

  if (comparator === 'BELOW') {
    return 'Opponent wins if BTC closes at or above the strike.';
  }

  return 'Custom outcome logic.';
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
      accepterAmountRequired: { toNumber?: () => number; toString: () => string };
      accepterAmount: { toNumber?: () => number; toString: () => string };
      expiryTs: { toNumber?: () => number; toString: () => string };
      state: Record<string, unknown>;
      creatorSide: number;
      accepterSide: number;
      winnerSide?: { toNumber?: () => number; toString: () => string } | number | null;
      marketKind?: Record<string, unknown> | null;
      priceSymbol?: Record<string, unknown> | null;
      priceVenue?: Record<string, unknown> | null;
      settlementMinuteTs?: { toNumber?: () => number; toString: () => string };
      comparator?: Record<string, unknown> | null;
      strikeE8?: { toNumber?: () => number; toString: () => string };
      resolvedPriceE8?: { toNumber?: () => number; toString: () => string };
      resolvedAtTs: { toNumber?: () => number; toString: () => string };
      resolutionStatus: Record<string, unknown>;
      payoutClaimed: boolean;
      creatorRefundClaimed: boolean;
      accepterRefundClaimed: boolean;
      betId: { toString: () => string };
    };

    const creatorAmountBase =
      typeof typed.creatorAmount?.toNumber === 'function'
        ? typed.creatorAmount.toNumber()
        : Number(typed.creatorAmount.toString());

    const accepterAmountRequiredBase =
      typeof typed.accepterAmountRequired?.toNumber === 'function'
        ? typed.accepterAmountRequired.toNumber()
        : Number(typed.accepterAmountRequired.toString());

    const accepterAmountBase =
      typeof typed.accepterAmount?.toNumber === 'function'
        ? typed.accepterAmount.toNumber()
        : Number(typed.accepterAmount.toString());

    const expiryTs =
      typeof typed.expiryTs?.toNumber === 'function'
        ? typed.expiryTs.toNumber()
        : Number(typed.expiryTs.toString());

    const settlementMinuteTs =
      typeof typed.settlementMinuteTs?.toNumber === 'function'
        ? typed.settlementMinuteTs.toNumber()
        : Number(typed.settlementMinuteTs?.toString?.() ?? '0');

    const strikeE8 =
      typeof typed.strikeE8?.toNumber === 'function'
        ? typed.strikeE8.toNumber()
        : Number(typed.strikeE8?.toString?.() ?? '0');

    const resolvedPriceE8 =
      typeof typed.resolvedPriceE8?.toNumber === 'function'
        ? typed.resolvedPriceE8.toNumber()
        : Number(typed.resolvedPriceE8?.toString?.() ?? '0');

    const resolvedAtTs =
      typeof typed.resolvedAtTs?.toNumber === 'function'
        ? typed.resolvedAtTs.toNumber()
        : Number(typed.resolvedAtTs?.toString?.() ?? '0');

    const winnerSide =
      typed.winnerSide === null || typed.winnerSide === undefined
        ? null
        : typeof typed.winnerSide === 'number'
          ? typed.winnerSide
          : typeof typed.winnerSide?.toNumber === 'function'
            ? typed.winnerSide.toNumber()
            : Number(typed.winnerSide.toString());

    const bet: RealBet = {
      pubkey,
      creator: typed.creator.toBase58(),
      accepter: typed.accepter.toBase58(),
      mint: typed.mint.toBase58(),
      creatorAmountUi: creatorAmountBase / 1_000_000,
      accepterAmountRequiredUi: accepterAmountRequiredBase / 1_000_000,
      accepterAmountUi: accepterAmountBase / 1_000_000,
      expiryTs,
      state: getStateLabel(typed.state),
      creatorSide: typed.creatorSide,
      accepterSide: typed.accepterSide,
      winnerSide,
      marketKind: getMarketKindLabel(typed.marketKind),
      priceSymbol: getPriceSymbolLabel(typed.priceSymbol),
      priceVenue: getPriceVenueLabel(typed.priceVenue),
      settlementMinuteTs,
      comparator: getComparatorLabel(typed.comparator),
      strikeE8,
      resolvedPriceE8,
      resolvedAtTs,
      resolutionStatus: getResolutionStatusLabel(typed.resolutionStatus),
      payoutClaimed: Boolean(typed.payoutClaimed),
      creatorRefundClaimed: Boolean(typed.creatorRefundClaimed),
      accepterRefundClaimed: Boolean(typed.accepterRefundClaimed),
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

export default async function BetDetailPage({
  params
}: {
  params: { id: string };
}) {
  const bet = await getRealBet(params.id);

  if (!bet) {
    notFound();
  }

  const defaultPubkey = PublicKey.default.toBase58();
  const isMatched = bet.accepter !== defaultPubkey && bet.accepterAmountUi > 0;
  const accepterForActions = bet.accepter === defaultPubkey ? null : bet.accepter;

  const displayedOpponentStake = isMatched
    ? bet.accepterAmountUi
    : bet.accepterAmountRequiredUi;

  const totalPot = bet.creatorAmountUi + displayedOpponentStake;
  const stakeRatio = formatStakeRatio(
    bet.creatorAmountUi,
    bet.accepterAmountRequiredUi
  );

  const isBtcThresholdBet =
    bet.marketKind === 'CRYPTO_PRICE_BINARY' &&
    bet.priceSymbol === 'BTC/USDT' &&
    bet.priceVenue === 'BINANCE_SPOT';

  const marketTitle = isBtcThresholdBet
    ? 'BTC/USDT threshold bet'
    : bet.marketKind === 'CUSTOM'
      ? 'Custom escrow bet'
      : 'On-chain bet';

  const marketSummary = isBtcThresholdBet
    ? 'Winner is decided by the Binance Spot 1-minute BTC/USDT candle close at the settlement minute.'
    : 'This is a custom escrow bet that uses the custom resolution path.';

  const directionLabel =
    bet.comparator === 'ABOVE_OR_EQUAL'
      ? 'Above or equal'
      : bet.comparator === 'BELOW'
        ? 'Below'
        : 'Not set';

  const winnerLabel = getWinnerLabel(bet);
  const solscanUrl = `https://solscan.io/account/${bet.pubkey}?cluster=devnet`;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-white/15 bg-panel/95 p-6 shadow-glow">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
          Real devnet bet
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          {marketTitle}
        </h1>
        <p className="mt-2 text-sm text-white/75">
          {marketSummary}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
          <span className="rounded-md border border-white/15 bg-black/20 px-3 py-1">
            Bet account: {shortAddress(bet.pubkey)}
          </span>
          <span className="rounded-md border border-white/15 bg-black/20 px-3 py-1">
            State: {bet.state === 'LOCKED' ? 'IN PLAY' : bet.state}
          </span>
          <span className="rounded-md border border-white/15 bg-black/20 px-3 py-1">
            Resolution: {bet.resolutionStatus}
          </span>
        </div>
        <a
          href={solscanUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-md border border-neon/50 bg-neon/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-neon transition hover:bg-neon/20"
        >
          View on Solscan
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-white/15 bg-panel/95 p-5 shadow-magenta transition hover:-translate-y-0.5 hover:border-white/20">
          <h2 className="font-semibold tracking-tight text-neon">Bet overview</h2>
          <ul className="mt-3 space-y-2 break-all text-sm text-white/80">
            <li>Creator wallet: {bet.creator}</li>
            <li>Opponent wallet: {isMatched ? bet.accepter : 'Unfilled'}</li>
            <li>Creator stake: {formatUSDC(bet.creatorAmountUi)}</li>
            <li>Opponent stake required: {formatUSDC(bet.accepterAmountRequiredUi)}</li>
            <li>
              Opponent stake posted:{' '}
              {isMatched ? formatUSDC(bet.accepterAmountUi) : 'Not filled yet'}
            </li>
            <li>Total pot: {formatUSDC(totalPot)}</li>
            <li>Stake ratio: {stakeRatio}</li>
            <li>Matched: {isMatched ? 'Yes' : 'No'}</li>
            <li>Internal bet id: {bet.betId}</li>
            <li>Mint: {bet.mint}</li>
          </ul>
        </section>

        <section className="rounded-lg border border-white/15 bg-panel/95 p-5 shadow-magenta transition hover:-translate-y-0.5 hover:border-white/20">
          <h2 className="font-semibold tracking-tight text-neon">
            {isBtcThresholdBet ? 'Market rules' : 'Settlement'}
          </h2>

          {isBtcThresholdBet ? (
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>Symbol: {bet.priceSymbol}</li>
              <li>Venue: Binance Spot</li>
              <li>Direction picked by creator: {directionLabel}</li>
              <li>Strike price: {formatPriceFromE8(bet.strikeE8)}</li>
              <li>Settlement minute: {formatUtcTimestamp(bet.settlementMinuteTs)}</li>
              <li>Resolved price: {formatPriceFromE8(bet.resolvedPriceE8)}</li>
              <li>Creator outcome rule: {getCreatorPositionLabel(bet.comparator)}</li>
              <li>Opponent outcome rule: {getOpponentPositionLabel(bet.comparator)}</li>
              <li>Resolved at: {bet.resolvedAtTs > 0 ? formatUtcTimestamp(bet.resolvedAtTs) : 'Not resolved yet'}</li>
              <li>Winning side: {winnerLabel}</li>
              <li>Payout claimed: {bet.payoutClaimed ? 'Yes' : 'No'}</li>
              <li>Creator refund claimed: {bet.creatorRefundClaimed ? 'Yes' : 'No'}</li>
              <li>Opponent refund claimed: {bet.accepterRefundClaimed ? 'Yes' : 'No'}</li>
            </ul>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>Expires: {formatUtcTimestamp(bet.expiryTs)}</li>
              <li>
                Resolved at:{' '}
                {bet.resolvedAtTs > 0
                  ? formatUtcTimestamp(bet.resolvedAtTs)
                  : 'Not resolved yet'}
              </li>
              <li>Creator side: {bet.creatorSide}</li>
              <li>Opponent side: {bet.accepterSide}</li>
              <li>Winning side: {bet.winnerSide ?? 'Not set'}</li>
              <li>Resolution status: {bet.resolutionStatus}</li>
              <li>Payout claimed: {bet.payoutClaimed ? 'Yes' : 'No'}</li>
              <li>Creator refund claimed: {bet.creatorRefundClaimed ? 'Yes' : 'No'}</li>
              <li>Opponent refund claimed: {bet.accepterRefundClaimed ? 'Yes' : 'No'}</li>
            </ul>
          )}

          <p className="mt-4 rounded-md border border-magenta/40 bg-magenta/10 p-3 text-xs font-medium tracking-wide text-magenta">
            This page reads live on-chain state directly from devnet.
          </p>
        </section>
      </div>

      <BetSettlementActions
        betPubkey={bet.pubkey}
        creator={bet.creator}
        accepter={accepterForActions}
        creatorSide={bet.creatorSide}
        winnerSide={bet.winnerSide}
        resolutionStatus={bet.resolutionStatus}
        payoutClaimed={bet.payoutClaimed}
        creatorRefundClaimed={bet.creatorRefundClaimed}
        accepterRefundClaimed={bet.accepterRefundClaimed}
      />
    </div>
  );
}
