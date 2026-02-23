import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-14">
      <section className="rounded-lg border border-white/15 bg-panel/90 p-8 shadow-glow md:p-12">
        
        <h1 className="max-w-3xl text-4xl font-black uppercase tracking-tight md:text-6xl">
          1v1 head to head Betting
        </h1>
        <p className="mt-4 max-w-2xl text-white/75">
          Put your money where your mouth is.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/create" className="rounded-md border border-neon/30 bg-neon/20 px-5 py-3 font-semibold text-neon hover:bg-neon/30 hover:border-neon/50">Create a bet</Link>
          <Link href="/bets" className="rounded-md border border-white/20 bg-black/20 px-5 py-3 font-semibold text-white hover:border-magenta/50 hover:text-gold">Browse bets</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
  {
    title: 'Non-custodial escrow',
    description: 'All betting funds are non-custodial in an escrow account, we do not hold anything.'
  },
  {
    title: 'Oracle settlement',
    description: 'Outcomes are resolved by verifiable oracle data.'
  },
  {
    title: '1v1 head-to-head',
    description: 'Peer to peer betting, put up or shut up.'
  },
  {
    title: 'Immutable rules',
    description: 'Terms are locked at creation and cannot be altered.'
  }
].map((item) => (
  <div key={item.title} className="rounded-lg border border-white/15 bg-panel p-5 transition hover:-translate-y-0.5 hover:border-magenta/40">
    <h3 className="font-semibold tracking-tight text-neon">{item.title}</h3>
    <p className="mt-2 text-sm text-white/70">{item.description}</p>
  </div>
))}
      </section>

      <section>
        <h2 className="text-2xl font-extrabold tracking-tight">How it works</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            'Create the bet',
            'Counterparty takes the bet',
            'Oracle determines who won',
            'Winner takes all'
          ].map((step, i) => (
            <div key={step} className="rounded-md border border-white/15 bg-panel p-4 transition hover:-translate-y-0.5 hover:border-magenta/45">
              <p className="text-xs font-semibold uppercase tracking-wider text-magenta">Step {i + 1}</p>
              <p className="mt-1 font-semibold">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
