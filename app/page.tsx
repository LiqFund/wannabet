import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-14">
      <section className="rounded-3xl border border-white/10 bg-panel/80 p-8 shadow-glow md:p-12">
        <p className="mb-3 inline-block rounded-full border border-neon/60 px-3 py-1 text-xs text-neon">crypto-native escrow</p>
        <h1 className="max-w-3xl text-4xl font-black uppercase tracking-wide md:text-6xl">
          WANNA BET? Head to Head Betting
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
        {['Non-custodial escrow', 'Oracle settlement', '1v1 head-to-head', 'Immutable rules'].map((item) => (
          <div key={item} className="rounded-2xl border border-white/10 bg-panel p-5">
            <h3 className="font-semibold text-neon">{item}</h3>
            <p className="mt-2 text-sm text-white/70">All betting funds are non-custodial in an escrow account, we don't hold anything.</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            'Create oracle template',
            'Counterparty takes the bet',
            'Resolve timestamp is reached',
            'Oracle result determines winner'
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
