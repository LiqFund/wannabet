'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type Sector = 'CRYPTO' | 'EQUITIES' | 'COMMODITIES' | 'FX' | 'SPORTS';
type ActiveTab = 'ALL' | Sector;
type BetType = 'THRESHOLD' | 'TIME_TO_TOUCH' | 'RELATIVE_PERFORMANCE' | 'MONEYLINE' | 'OVER_UNDER';
type BetStatus = 'LIVE' | 'AVAILABLE';

type HomeBet = {
  id: string;
  sector: Sector;
  betType: BetType;
  title: string;
  amountUsd: number;
  totalPotUsd?: number;
  timeRemainingLabel: string;
  status: BetStatus;
  creator: { type: 'sol'; id: string } | { type: 'x'; handle: string };
  makerEscrowUsd?: number;
  toAcceptUsd?: number;
  oddsText?: string;
  participants?: { left: string; right: string };
};

type ParticipantType = 'sol' | 'x';
type SortOrder = 'BIGGEST' | 'SMALLEST';
type ActiveStatus = BetStatus;

const primaryCategories: ActiveTab[] = ['ALL', 'CRYPTO', 'EQUITIES', 'COMMODITIES', 'FX', 'SPORTS'];

const quickFilters: string[] = [];

const homeBets: HomeBet[] = [
  {
    id: 'crypto-btc-threshold',
    sector: 'CRYPTO',
    betType: 'THRESHOLD',
    title: 'BTC closes above $95k by Friday close?',
    amountUsd: 4200000,
    timeRemainingLabel: '1D',
    status: 'LIVE',
    creator: { type: 'x', handle: 'solking' }
  },
  {
    id: 'crypto-btc-touch',
    sector: 'CRYPTO',
    betType: 'TIME_TO_TOUCH',
    title: 'ETH touches $5k before month end?',
    amountUsd: 900000,
    totalPotUsd: 900000,
    timeRemainingLabel: '10D',
    status: 'AVAILABLE',
    creator: { type: 'x', handle: 'alpha_trades' },
    makerEscrowUsd: 720000,
    toAcceptUsd: 180000,
    oddsText: '4–1'
  },
  {
    id: 'equities-relative-performance',
    sector: 'EQUITIES',
    betType: 'RELATIVE_PERFORMANCE',
    title: 'MSFT outperforms AMZN over 30 days?',
    amountUsd: 950000,
    timeRemainingLabel: '90D',
    status: 'LIVE',
    creator: { type: 'x', handle: 'nftwizard' }
  },
  {
    id: 'equities-aapl-threshold',
    sector: 'EQUITIES',
    betType: 'THRESHOLD',
    title: 'AAPL closes above $215 by Friday close?',
    amountUsd: 500000,
    totalPotUsd: 500000,
    timeRemainingLabel: '5D',
    status: 'AVAILABLE',
    creator: { type: 'sol', id: 'KHP7PU4rY5xwNcdgQ8m2pN7UL4abEi9T7uQZ8eLmX3P' },
    makerEscrowUsd: 250000,
    toAcceptUsd: 250000
  },
  {
    id: 'equities-nvda-touch',
    sector: 'EQUITIES',
    betType: 'TIME_TO_TOUCH',
    title: 'NVDA touches $155 before month end?',
    amountUsd: 1040000,
    timeRemainingLabel: '18D',
    status: 'LIVE',
    creator: { type: 'x', handle: 'chainmax' }
  },
  {
    id: 'finance-spx-threshold',
    sector: 'COMMODITIES',
    betType: 'THRESHOLD',
    title: 'WTI crude closes above $85 before quarter end?',
    amountUsd: 2700000,
    timeRemainingLabel: '24D',
    status: 'LIVE',
    creator: { type: 'sol', id: 'J3svMbcXxURx9pqd7nR4Kta4F7hGH5ekWqk3sX2U1yTZ' }
  },
  {
    id: 'finance-gold-touch',
    sector: 'COMMODITIES',
    betType: 'TIME_TO_TOUCH',
    title: 'Gold touches $2,600 before month end?',
    amountUsd: 650000,
    totalPotUsd: 650000,
    timeRemainingLabel: '13D',
    status: 'AVAILABLE',
    creator: { type: 'x', handle: 'defi_drifter' },
    makerEscrowUsd: 487500,
    toAcceptUsd: 162500,
    oddsText: '3–1'
  },
  {
    id: 'commodities-silver-threshold',
    sector: 'COMMODITIES',
    betType: 'THRESHOLD',
    title: 'Silver closes above $34 by month end?',
    amountUsd: 740000,
    timeRemainingLabel: '14D',
    status: 'LIVE',
    creator: { type: 'x', handle: 'mintoracle' }
  },
  {
    id: 'fx-eurusd-threshold',
    sector: 'FX',
    betType: 'THRESHOLD',
    title: 'EUR/USD closes above 1.12 by month end?',
    amountUsd: 1200000,
    totalPotUsd: 1200000,
    timeRemainingLabel: '12D',
    status: 'AVAILABLE',
    creator: { type: 'sol', id: '4q8S5LhK2pmvVwNzY1RtxJdA7mCFP9sQxH2bzrT6LnYu' },
    makerEscrowUsd: 600000,
    toAcceptUsd: 600000
  },
  {
    id: 'fx-usdjpy-threshold',
    sector: 'FX',
    betType: 'THRESHOLD',
    title: 'USD/JPY closes below 149 by Friday close?',
    amountUsd: 860000,
    timeRemainingLabel: '4D',
    status: 'LIVE',
    creator: { type: 'x', handle: 'blockrunner' }
  },
  {
    id: 'sports-chiefs-49ers-moneyline',
    sector: 'SPORTS',
    betType: 'MONEYLINE',
    title: 'Chiefs win vs 49ers?',
    amountUsd: 903000,
    timeRemainingLabel: '5D',
    status: 'LIVE',
    creator: { type: 'x', handle: 'satstacker' }
  },
  {
    id: 'sports-total-over-under',
    sector: 'SPORTS',
    betType: 'OVER_UNDER',
    title: 'Total points over 47.5?',
    amountUsd: 500000,
    totalPotUsd: 500000,
    timeRemainingLabel: '9H',
    status: 'AVAILABLE',
    creator: { type: 'x', handle: 'onchainpulse' },
    makerEscrowUsd: 333333,
    toAcceptUsd: 166667,
    oddsText: '2–1'
  },
  {
    id: 'sports-fight-ko-tko',
    sector: 'SPORTS',
    betType: 'MONEYLINE',
    title: 'Fighter A wins by KO/TKO?',
    amountUsd: 2000000,
    totalPotUsd: 2000000,
    timeRemainingLabel: '3D',
    status: 'AVAILABLE',
    creator: { type: 'sol', id: '7nLeP3gHtKQ9xUaM2vcDfR8yW5sBjLp1Tz6mNdF4CrXe' },
    makerEscrowUsd: 1000000,
    toAcceptUsd: 1000000
  }
];

const getAvailableTotalPot = (bet: HomeBet): number => {
  const makerEscrowUsd = bet.makerEscrowUsd ?? 0;
  const toAcceptUsd = bet.toAcceptUsd ?? 0;
  return makerEscrowUsd + toAcceptUsd;
};

const getHeadlineAmount = (bet: HomeBet): number => {
  if (bet.status === 'AVAILABLE') {
    return bet.totalPotUsd ?? getAvailableTotalPot(bet);
  }

  return bet.amountUsd;
};

const base58Chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';

const mockXUsernames = [
  'solking',
  'alpha_trades',
  'nftwizard',
  'chainmax',
  'defi_drifter',
  'mintoracle',
  'blockrunner',
  'satstacker',
  'onchainpulse',
  'tokenpilot',
  'sol_scout',
  'ledgerlane',
  'cryptonova',
  'dex_hunter',
  'nodewatch',
  'vaultvision',
  'yieldcaptain',
  'alphaorbit',
  'marketmancer',
  'oracle_ops',
  'betbyte',
  'liquidlark',
  'chaintempo',
  'signalforge'
];

function generateShortSolAddress() {
  return `${Array.from({ length: 6 }, () => base58Chars[Math.floor(Math.random() * base58Chars.length)]).join('')}...`;
}

function getRandomXUsername() {
  return `@${mockXUsernames[Math.floor(Math.random() * mockXUsernames.length)]}`;
}

function getRandomParticipant(): ParticipantType {
  return Math.random() < 0.5 ? 'sol' : 'x';
}

function shortenSolAddress(id: string): string {
  return `${id.slice(0, 6)}...`;
}

function formatUsdCompact(amountUsd: number): string {
  if (amountUsd >= 1_000_000) {
    return `$${(amountUsd / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (amountUsd >= 1_000) {
    return `$${Math.round(amountUsd / 1_000)}k`;
  }

  return `$${amountUsd}`;
}

function XIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3 fill-current text-white/60">
      <path d="M18.9 2H22l-6.77 7.74L23 22h-6.07l-4.76-6.98L6.05 22H3l7.24-8.28L1 2h6.2l4.31 6.39L18.9 2Zm-1.07 18h1.69L6.3 3.9H4.5L17.83 20Z" />
    </svg>
  );
}

export default function HomePage() {
  const [activeStatus, setActiveStatus] = useState<ActiveStatus>('LIVE');
  const [activeTab, setActiveTab] = useState<ActiveTab>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('BIGGEST');

  const marketCards = useMemo(
    () =>
      homeBets.map((bet) => {
        if (bet.participants) {
          return {
            bet,
            participantType: 'x' as const,
            left: bet.participants.left,
            right: bet.participants.right
          };
        }

        const participantType = getRandomParticipant();
        return {
          bet,
          participantType,
          left: participantType === 'sol' ? generateShortSolAddress() : getRandomXUsername(),
          right: participantType === 'sol' ? generateShortSolAddress() : getRandomXUsername()
        };
      }),
    []
  );

  const displayedMarketCards = useMemo(() => {
    const statusFiltered = marketCards.filter(({ bet }) => bet.status === activeStatus);
    const sectorFiltered = activeTab === 'ALL' ? statusFiltered : statusFiltered.filter(({ bet }) => bet.sector === activeTab);

    return sectorFiltered.sort((a, b) => {
      if (sortOrder === 'SMALLEST') {
        return getHeadlineAmount(a.bet) - getHeadlineAmount(b.bet);
      }

      return getHeadlineAmount(b.bet) - getHeadlineAmount(a.bet);
    });
  }, [activeStatus, activeTab, marketCards, sortOrder]);

  return (
    <div className="space-y-6">
      <section className="hud-panel overflow-hidden rounded-xl border border-white/10 bg-panel p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          {quickFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              className="rounded-md border border-white/15 bg-black/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.11em] text-white/70 hover:border-cyan/30 hover:text-white"
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {(['LIVE', 'AVAILABLE'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActiveStatus(status)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] ${
                    activeStatus === status
                      ? status === 'LIVE'
                        ? 'border-rose-500/60 bg-rose-500/20 text-white'
                        : 'border-emerald-500/60 bg-emerald-500/20 text-white'
                      : 'border-white/15 bg-black/20 text-white/75 hover:border-cyan/30 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {primaryCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveTab(category)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] ${
                    activeTab === category
                      ? 'border-cyan/45 bg-cyan/10 text-cyan'
                      : 'border-white/15 bg-black/20 text-white/75 hover:border-cyan/30 hover:text-white'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">
            Sort
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              className="rounded-md border border-white/15 bg-black/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/90 outline-none hover:border-cyan/30"
            >
              <option value="BIGGEST">Biggest</option>
              <option value="SMALLEST">Smallest</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-panel p-5 md:flex md:items-center md:justify-between">
        <div>
          <p className="hud-label text-white/50">Create your own bet</p>
          <h2 className="mt-2 text-2xl font-black uppercase">Peer to Peer betting, Challenge anyone 1v1</h2>
          <p className="mt-2 max-w-xl text-sm text-white/70">Define the terms, pick oracle resolution, and lock collateral in a non-custodial contract. Winner takes all.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
          <Link href="/create" className="rounded-md border border-neon/40 bg-neon/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-neon">
            Create a bet
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {displayedMarketCards.map(({ bet, participantType, left, right }) => (
          <article key={bet.id} className="hud-card rounded-md border border-white/10 bg-panel p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                {bet.status === 'AVAILABLE' ? (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45">Created by</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/90">
                      {bet.creator.type === 'x' ? (
                        <span className="inline-flex items-center gap-1 align-baseline">
                          <XIcon />
                          <span>@{bet.creator.handle}</span>
                        </span>
                      ) : (
                        shortenSolAddress(bet.creator.id)
                      )}
                    </p>
                  </>
                ) : (
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/90">
                    {participantType === 'sol' ? (
                      <>
                        {left} <span className="mx-1 text-rose-700">VS</span> {right}
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 align-baseline">
                          <XIcon />
                          <span>{left}</span>
                        </span>{' '}
                        <span className="mx-1 text-rose-700">VS</span>{' '}
                        <span className="inline-flex items-center gap-1 align-baseline">
                          <XIcon />
                          <span>{right}</span>
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
                  bet.status === 'LIVE'
                    ? 'border border-rose-500/40 bg-rose-500/15 text-rose-200'
                    : 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                }`}
              >
                {bet.status}
              </span>
            </div>

            <p className="mt-3 text-3xl font-black text-white">{formatUsdCompact(getHeadlineAmount(bet))}</p>
            <p className="mt-2 line-clamp-2 text-sm text-white/80">{bet.title}</p>
            {bet.status === 'AVAILABLE' && (
              <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45">Accept terms</p>
                  {bet.oddsText && (
                    <span className="rounded-full border border-cyan/35 bg-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan">
                      Odds {bet.oddsText}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-y-1 text-[11px] uppercase tracking-[0.08em]">
                  <p className="text-white/50">Maker escrow</p>
                  <p className="font-semibold text-white/85">{formatUsdCompact(bet.makerEscrowUsd ?? getHeadlineAmount(bet))}</p>
                  <p className="text-white/50">To accept</p>
                  <p className="font-semibold text-white/85">{formatUsdCompact(bet.toAcceptUsd ?? bet.makerEscrowUsd ?? getHeadlineAmount(bet))}</p>
                </div>
              </div>
            )}
            <div className="mt-3 border-t border-white/10" />
            {bet.status === 'AVAILABLE' ? (
              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.08em]">
                  <p className="text-white/45">Time remaining</p>
                  <p className="mt-1 text-sm font-semibold text-white/80">{bet.timeRemainingLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    window.alert('Accept flow coming soon');
                  }}
                  className="rounded-md border border-neon/50 bg-neon/25 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.09em] text-neon transition hover:bg-neon/35"
                >
                  ACCEPT BET · {formatUsdCompact(bet.toAcceptUsd ?? bet.makerEscrowUsd ?? getHeadlineAmount(bet))}
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.08em]">
                <p className="text-white/45">Time remaining</p>
                <p className="text-white/80">{bet.timeRemainingLabel}</p>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
