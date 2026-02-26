import Link from 'next/link';

type Market = {
  title: string;
  volume: string;
  closes: string;
};

type ParticipantType = 'sol' | 'x';

const primaryCategories = ['Crypto', 'Finance', 'Sports'];

const quickFilters: string[] = [];

const markets: Market[] = [
  {
    title: 'BTC above $95k by Friday close?',
    volume: '$4.2M Vol',
    closes: 'Closes in 1d'
  },
  {
    title: 'S&P 500 closes above 6,200 before quarter end?',
    volume: '$2.7M Vol',
    closes: 'Closes in 24d'
  },
  {
    title: 'US inflation print below 2.8% next release?',
    volume: '$2.1M Vol',
    closes: 'Closes in 11d'
  },
  {
    title: 'Will Ethereum ETF inflows top $1B this month?',
    volume: '$1.8M Vol',
    closes: 'Closes in 10d'
  },
  {
    title: 'Will the Euro outperform USD this month?',
    volume: '$398k Vol',
    closes: 'Closes in 8d'
  },
  {
    title: 'Gold touches $2,600 before month end?',
    volume: '$1.1M Vol',
    closes: 'Closes in 13d'
  },
  {
    title: 'Premier League winner confirmed by March 31?',
    volume: '$672k Vol',
    closes: 'Closes in 18d'
  },
  {
    title: 'NCAA upset in top 10 this weekend?',
    volume: '$153k Vol',
    closes: 'Closes in 2d'
  },
  {
    title: 'Everton to score 2+ goals this match?',
    volume: '$214k Vol',
    closes: 'Closes in 7h'
  },
  {
    title: 'Lakers cover -4.5 in next game?',
    volume: '$591k Vol',
    closes: 'Closes in 9h'
  },
  {
    title: 'Djokovic reaches final this tournament?',
    volume: '$316k Vol',
    closes: 'Closes in 3d'
  },
  {
    title: 'Chiefs win by 7+ next game?',
    volume: '$903k Vol',
    closes: 'Closes in 5d'
  }
];

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

function XIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3 fill-current text-white/60">
      <path d="M18.9 2H22l-6.77 7.74L23 22h-6.07l-4.76-6.98L6.05 22H3l7.24-8.28L1 2h6.2l4.31 6.39L18.9 2Zm-1.07 18h1.69L6.3 3.9H4.5L17.83 20Z" />
    </svg>
  );
}

export default function HomePage() {
  const marketCards = markets.map((market) => {
    const participantType = getRandomParticipant();
    return {
      market,
      participantType,
      left: participantType === 'sol' ? generateShortSolAddress() : getRandomXUsername(),
      right: participantType === 'sol' ? generateShortSolAddress() : getRandomXUsername()
    };
  });

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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {primaryCategories.map((category, index) => (
            <button
              key={category}
              type="button"
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] ${
                index === 0
                  ? 'border-cyan/45 bg-cyan/10 text-cyan'
                  : 'border-white/15 bg-black/20 text-white/75 hover:border-cyan/30 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-panel p-5 md:flex md:items-center md:justify-between">
        <div>
          <p className="hud-label text-white/50">Build your own market</p>
          <h2 className="mt-2 text-2xl font-black uppercase">Challenge anyone 1v1</h2>
          <p className="mt-2 max-w-xl text-sm text-white/70">Define the terms, pick oracle resolution, and lock collateral in a non-custodial contract.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
          <Link href="/create" className="rounded-md border border-neon/40 bg-neon/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-neon">
            Create a market
          </Link>
          <Link href="/bets" className="rounded-md border border-white/20 bg-black/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white/85">
            View all bets
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {marketCards.map(({ market, participantType, left, right }) => (
          <article key={market.title} className="hud-card rounded-md border border-white/10 bg-panel p-3">
            <div className="flex items-start justify-between gap-2">
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
              <span className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-200">LIVE</span>
            </div>

            <p className="mt-3 text-3xl font-black text-white">{market.volume.replace(' Vol', '')}</p>
            <p className="mt-2 line-clamp-2 text-sm text-white/80">{market.title}</p>
            <div className="mt-3 border-t border-white/10" />
            <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.08em]">
              <p className="text-white/45">Time remaining</p>
              <p className="text-white/80">{market.closes.replace('Closes in ', '')}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
