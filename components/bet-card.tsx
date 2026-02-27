import { BetRecord } from '@/lib/betsCatalog';
import Link from 'next/link';
import { formatDateUtc, formatTemplate, formatUSDC } from '@/lib/format';
import { HandleBadge } from './handle-badge';

type Props = { bet: BetRecord };

export function BetCard({ bet }: Props) {
  const pot = Number(bet.stakePerSide) * 2;
  return (
    <article className="rounded-lg border border-white/15 bg-panel/95 p-5 shadow-magenta transition hover:-translate-y-0.5 hover:border-magenta/40">
      {bet.handlesPublic && (bet.xCreatorHandle || bet.xOpponentHandle) ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {bet.xCreatorHandle ? <HandleBadge handle={bet.xCreatorHandle} /> : null}
          <span className="text-white/50">vs</span>
          {bet.xOpponentHandle ? <HandleBadge handle={bet.xOpponentHandle} /> : <span className="text-white/40">TBD</span>}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold tracking-tight text-white">{bet.title}</h3>
      <p className="mt-1 text-sm text-white/70">{formatTemplate(bet)}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-white/70">
        <div>
          <p>Stake / side</p>
          <p className="text-sm font-semibold text-neon">{formatUSDC(bet.stakePerSide)}</p>
        </div>
        <div>
          <p>Total pot</p>
          <p className="text-sm font-semibold text-neon">{formatUSDC(pot)}</p>
        </div>
        <div>
          <p>Resolves</p>
          <p className="text-sm font-semibold text-white">{formatDateUtc(bet.resolveAt)}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-md border border-white/20 px-3 py-1 text-xs tracking-wide text-white/70">{bet.status}</span>
        <Link
          className="rounded-md border border-neon/30 bg-neon/20 px-4 py-2 text-xs font-semibold tracking-wide text-neon transition hover:bg-neon/30 hover:border-neon/50"
          href={`/bets/${bet.id}`}
        >
          {bet.status === 'OPEN' ? 'Take bet' : 'View'}
        </Link>
      </div>
    </article>
  );
}
