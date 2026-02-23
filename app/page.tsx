import Link from 'next/link';

type Market = {
  title: string;
  subtitle: string;
  volume: string;
  chance: string;
  yesPrice: string;
  noPrice: string;
  closes: string;
  trend: 'up' | 'down' | 'flat';
};

const primaryCategories = ['Finance', 'Sports'];

const quickFilters = ['Trending', 'Breaking', 'New', 'Ending Soon', 'Most Volume', 'Big Movers'];

const markets: Market[] = [
  {
    title: 'BTC above $95k by Friday close?',
    subtitle: 'Crypto',
    volume: '$4.2M Vol',
    chance: '51%',
    yesPrice: '51¢',
    noPrice: '49¢',
    closes: 'Closes in 1d',
    trend: 'down'
  },
  {
    title: 'S&P 500 closes above 6,200 before quarter end?',
    subtitle: 'Equities',
    volume: '$2.7M Vol',
    chance: '7%',
    yesPrice: '7¢',
    noPrice: '93¢',
    closes: 'Closes in 24d',
    trend: 'flat'
  },
  {
    title: 'US inflation print below 2.8% next release?',
    subtitle: 'Macro',
    volume: '$2.1M Vol',
    chance: '55%',
    yesPrice: '55¢',
    noPrice: '45¢',
    closes: 'Closes in 11d',
    trend: 'up'
  },
  {
    title: 'Will Ethereum ETF inflows top $1B this month?',
    subtitle: 'Crypto ETFs',
    volume: '$1.8M Vol',
    chance: '35%',
    yesPrice: '35¢',
    noPrice: '65¢',
    closes: 'Closes in 10d',
    trend: 'down'
  },
  {
    title: 'Will the Euro outperform USD this month?',
    subtitle: 'FX Markets',
    volume: '$398k Vol',
    chance: '49%',
    yesPrice: '49¢',
    noPrice: '51¢',
    closes: 'Closes in 8d',
    trend: 'flat'
  },
  {
    title: 'Gold touches $2,600 before month end?',
    subtitle: 'Commodities',
    volume: '$1.1M Vol',
    chance: '33%',
    yesPrice: '33¢',
    noPrice: '67¢',
    closes: 'Closes in 13d',
    trend: 'up'
  },
  {
    title: 'Premier League winner confirmed by March 31?',
    subtitle: 'Football',
    volume: '$672k Vol',
    chance: '21%',
    yesPrice: '21¢',
    noPrice: '79¢',
    closes: 'Closes in 18d',
    trend: 'down'
  },
  {
    title: 'NCAA upset in top 10 this weekend?',
    subtitle: 'College Sports',
    volume: '$153k Vol',
    chance: '34%',
    yesPrice: '34¢',
    noPrice: '66¢',
    closes: 'Closes in 2d',
    trend: 'down'
  },
  {
    title: 'Everton to score 2+ goals this match?',
    subtitle: 'Football',
    volume: '$214k Vol',
    chance: '25%',
    yesPrice: '25¢',
    noPrice: '75¢',
    closes: 'Closes in 7h',
    trend: 'up'
  },
  {
    title: 'Lakers cover -4.5 in next game?',
    subtitle: 'Basketball',
    volume: '$591k Vol',
    chance: '58%',
    yesPrice: '58¢',
    noPrice: '42¢',
    closes: 'Closes in 9h',
    trend: 'flat'
  },
  {
    title: 'Djokovic reaches final this tournament?',
    subtitle: 'Tennis',
    volume: '$316k Vol',
    chance: '47%',
    yesPrice: '47¢',
    noPrice: '53¢',
    closes: 'Closes in 3d',
    trend: 'up'
  },
  {
    title: 'Chiefs win by 7+ next game?',
    subtitle: 'American Football',
    volume: '$903k Vol',
    chance: '41%',
    yesPrice: '41¢',
    noPrice: '59¢',
    closes: 'Closes in 5d',
    trend: 'flat'
  }
];

function trendClasses(trend: Market['trend']) {
  if (trend === 'up') return 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15';
  if (trend === 'down') return 'text-rose-300 border-rose-500/40 bg-rose-500/15';
  return 'text-cyan border-cyan/45 bg-cyan/10';
}

export default function HomePage() {
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {markets.map((market) => (
          <article key={market.title} className="hud-card rounded-md border border-white/10 bg-panel p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-white/90">{market.title}</p>
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${trendClasses(market.trend)}`}>
                {market.trend}
              </span>
            </div>

            <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-white/45">{market.subtitle}</p>

            <div className="mt-3 flex items-end justify-between border-y border-white/10 py-2.5">
              <div>
                <p className="text-xl font-black text-white">{market.chance}</p>
                <p className="text-[11px] uppercase tracking-[0.09em] text-white/45">Implied chance</p>
              </div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-white/60">{market.volume}</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-200"
              >
                Yes <span className="text-emerald-50/80">{market.yesPrice}</span>
              </button>
              <button
                type="button"
                className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-rose-200"
              >
                No <span className="text-rose-50/80">{market.noPrice}</span>
              </button>
            </div>

            <p className="mt-3 text-[11px] uppercase tracking-[0.08em] text-white/45">{market.closes}</p>
          </article>
        ))}
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
    </div>
  );
}
