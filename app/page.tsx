import Link from 'next/link';

type Market = {
  title: string;
  volume: string;
  closes: string;
};

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
        {markets.map((market) => (
          <article key={market.title} className="hud-card rounded-md border border-white/10 bg-panel p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/90">
                @ALPHA <span className="mx-1 text-rose-700">VS</span> @BETA
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
