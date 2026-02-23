import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-14">
      <section className="rounded-3xl border border-white/10 bg-panel/80 p-8 shadow-glow md:p-12">
        
        <h1 className="max-w-3xl text-4xl font-black uppercase tracking-wide md:text-6xl">
          1v1 head to head Betting
        </h1>
        <p className="mt-4 max-w-2xl text-white/75">
          Put your money where your mouth is.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/create" className="rounded-full bg-neon/20 px-5 py-3 font-semibold text-neon">Create a bet</Link>
          <Link href="/bets" className="rounded-full border border-white/20 px-5 py-3 font-semibold text-white">Browse bets</Link>
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
  <div key={item.title} className="rounded-2xl border border-white/10 bg-panel p-5">
    <h3 className="font-semibold text-neon">{item.title}</h3>
    <p className="mt-2 text-sm text-white/70">{item.description}</p>
  </div>
))}
      </section>

      <section>
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            'Create the bet',
            'Counterparty takes the bet',
            'Oracle determines who won',
            'Winner takes all'
          ].map((step, i) => (
            <div key={step} className="rounded-xl border border-white/10 bg-panel p-4">
              <p className="text-xs text-magenta">Step {i + 1}</p>
              <p className="mt-1 font-semibold">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
