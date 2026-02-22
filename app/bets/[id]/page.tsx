import { notFound } from 'next/navigation';
import { getBetById } from '@/lib/betsCatalog';
import { formatDateUtc, formatTemplate, shortAddress } from '@/lib/format';
import { HandleBadge } from '@/components/handle-badge';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const bet = getBetById(params.id);
  if (!bet) return { title: 'Bet not found' };
  return {
    title: `${bet.title} | wannabet.you`,
    openGraph: {
      title: bet.title,
      description: formatTemplate(bet),
      images: [`/og/bets/${bet.id}`]
    }
  };
}

export default async function BetDetailPage({ params }: { params: { id: string } }) {
  const bet = getBetById(params.id);
  if (!bet) notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-panel p-6">
        <h1 className="text-3xl font-black">{bet.title}</h1>
        <p className="mt-2 text-white/75">{bet.description}</p>
        {bet.handlesPublic && (bet.xCreatorHandle || bet.xOpponentHandle) ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {bet.xCreatorHandle ? <HandleBadge handle={bet.xCreatorHandle} /> : null}
            <span className="text-white/50">vs</span>
            {bet.xOpponentHandle ? <HandleBadge handle={bet.xOpponentHandle} /> : <span className="text-white/40">TBD</span>}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-panel p-5">
          <h2 className="font-semibold text-neon">Bet details</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>Template: {formatTemplate(bet)}</li>
            <li>Stake / side: {bet.stakePerSide.toString()} {bet.currencyLabel}</li>
            <li>Total pot: {Number(bet.stakePerSide) * 2} {bet.currencyLabel}</li>
            <li>Creator: {shortAddress(bet.creatorAddress)}</li>
            <li>Taker: {bet.takerAddress ? shortAddress(bet.takerAddress) : 'Unfilled'}</li>
            <li>Oracle source: {bet.oracleSource}</li>
          </ul>
          <p className="mt-4 rounded-xl border border-magenta/30 bg-magenta/10 p-3 text-xs text-magenta">Rules are immutable once bet is created.</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-panel p-5">
          <h2 className="font-semibold text-neon">Timeline</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>Created: {formatDateUtc(bet.createdAt)}</li>
            <li>Matched: {bet.status !== 'OPEN' ? 'Yes' : 'Pending'}</li>
            <li>Resolves at: {formatDateUtc(bet.resolveAt)}</li>
            <li>Resolved: {bet.status === 'RESOLVED' ? formatDateUtc(bet.resolution?.resolvedAt ?? new Date()) : 'Pending'}</li>
          </ul>
          <div className="mt-4 space-y-2">
            <p className="rounded-xl border border-white/10 bg-bg p-3 text-xs text-white/70">
              Front-end demo mode: bet creation, taking, and resolution actions are disabled while backend services are offline.
            </p>
            <p className="text-xs text-white/60">Simulated oracle in MVP. Deterministic output from bet id; replace with on-chain oracle call.</p>
          </div>
          {bet.resolution ? (
            <p className="mt-3 text-sm text-white/80">Resolution: oracle={bet.resolution.oracleValue?.toString() ?? 'n/a'} | outcome={bet.outcome}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
