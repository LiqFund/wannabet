import Link from 'next/link';

const liveChallenges = [
  {
    challenger: '@ALPHA',
    opponent: '@BETA',
    stake: '$50,000',
    condition: 'BTC > 100K by Friday',
    remaining: '12h 32m'
  },
  {
    challenger: '@NOVA',
    opponent: '@RIFT',
    stake: '$18,500',
    condition: 'ETH closes green this week',
    remaining: '9h 11m'
  },
  {
    challenger: '@KANE',
    opponent: '@LYNX',
    stake: '$72,000',
    condition: 'SOL flips BNB market cap',
    remaining: '1d 4h'
  },
  {
    challenger: '@VECTOR',
    opponent: '@ECHO',
    stake: '$12,000',
    condition: 'Nasdaq ends above 19,000',
    remaining: '6h 48m'
  },
  {
    challenger: '@ONYX',
    opponent: '@QUILL',
    stake: '$95,000',
    condition: 'Gold touches 2,600 this month',
    remaining: '2d 8h'
  },
  {
    challenger: '@MERC',
    opponent: '@ZED',
    stake: '$31,750',
    condition: 'Fed holds rates this meeting',
    remaining: '14h 05m'
  },
  {
    challenger: '@TORCH',
    opponent: '@FABLE',
    stake: '$44,000',
    condition: 'Oil stays above 90 all week',
    remaining: '20h 19m'
  },
  {
    challenger: '@RUNE',
    opponent: '@PHOENIX',
    stake: '$26,250',
    condition: 'S&P closes above 6,000 Friday',
    remaining: '1d 1h'
  }
];

const ringRules = [
  {
    title: 'NON-CUSTODIAL ESCROW',
    description: 'All betting funds are non-custodial in an escrow account, we do not hold anything.'
  },
  {
    title: 'ORACLE SETTLEMENT',
    description: 'Outcomes are resolved by verifiable oracle data.'
  },
  {
    title: '1V1 HEAD-TO-HEAD',
    description: 'Peer to peer betting, put up or shut up.'
  },
  {
    title: 'IMMUTABLE RULES',
    description: 'Terms are locked at creation and cannot be altered.'
  }
];

export default function HomePage() {
  return (
    <div className="space-y-12 md:space-y-14">
      <section className="relative overflow-hidden border border-white/10 bg-bg px-6 py-10 md:px-10 md:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_70%_at_35%_0%,rgba(208,177,115,0.16),transparent_62%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.8)_0_0.6px,transparent_0.7px),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.6)_0_0.6px,transparent_0.7px)] [background-size:5px_5px,6px_6px]" />

        <div className="relative max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-magenta">Live Main Event</p>
          <div className="mt-4 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.12em] text-white/90 md:text-base">
            <span>@ALPHA</span>
            <span className="text-magenta">VS</span>
            <span>@BETA</span>
          </div>
          <div className="mt-3 h-px w-full max-w-xl bg-white/20" />
          <p className="mt-4 text-2xl font-black uppercase tracking-[0.05em] text-magenta md:text-4xl">$50,000 ON THE LINE</p>

          <h1 className="mt-8 max-w-3xl text-4xl font-black uppercase leading-[0.95] tracking-[-0.02em] md:text-6xl">
            1v1 head to head Betting
          </h1>
          <p className="mt-4 max-w-2xl text-white/75">Put your money where your mouth is.</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/create" className="rounded-xl border border-neon/30 bg-neon/20 px-5 py-3 font-semibold text-neon hover:bg-neon/30 hover:border-neon/50">
              Create a bet
            </Link>
            <Link href="/bets" className="rounded-xl border border-white/20 bg-black/20 px-5 py-3 font-semibold text-white hover:border-magenta/50 hover:text-gold">
              Browse bets
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold uppercase tracking-[0.01em]">Live Challenges</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Fight Card Board</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {liveChallenges.map((challenge) => (
            <article
              key={`${challenge.challenger}-${challenge.opponent}`}
              className="group relative overflow-hidden rounded-md border border-white/10 bg-panel p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/25"
            >
              <span className="absolute left-0 top-0 h-full w-[2px] bg-magenta" />
              <div className="relative">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/85">
                    {challenge.challenger} <span className="px-1 text-magenta">VS</span> {challenge.opponent}
                  </p>
                  <span className="rounded-md border border-magenta/60 bg-magenta/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-magenta">
                    Live
                  </span>
                </div>
                <p className="mt-4 text-3xl font-black tracking-tight text-white">{challenge.stake}</p>
                <p className="mt-2 text-sm text-white/75">{challenge.condition}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs uppercase tracking-[0.1em] text-white/60">
                  <span>Time Remaining</span>
                  <span className="font-semibold text-white/80">{challenge.remaining}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-extrabold uppercase tracking-[0.01em]">Rules of the Ring</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {ringRules.map((item, index) => (
            <article key={item.title} className="rounded-md border border-white/10 bg-panel p-4 transition hover:-translate-y-0.5 hover:border-white/25">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-magenta">Rule {String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-2 text-sm font-extrabold uppercase tracking-[0.06em] text-neon">{item.title}</h3>
              <p className="mt-2 text-sm leading-snug text-white/75">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-extrabold uppercase tracking-[0.01em]">How it works</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {['Create the bet', 'Counterparty takes the bet', 'Oracle determines who won', 'Winner takes all'].map((step, i) => (
            <div key={step} className="rounded-md border border-white/10 bg-panel p-4 transition hover:-translate-y-0.5 hover:border-white/25">
              <p className="inline-block border border-magenta/60 bg-magenta/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-magenta">
                Step {i + 1}
              </p>
              <p className="mt-3 font-semibold text-white/90">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
