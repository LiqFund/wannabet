import { BetRecord } from '@/lib/betsCatalog';
import Link from 'next/link';
import { formatDateUtc, formatTemplate } from '@/lib/format';
import { HandleBadge } from './handle-badge';

type Props = { bet: BetRecord };

export function BetCard({ bet }: Props) {
  const pot = Number(bet.stakePerSide) * 2;
  return (
    <article className="rounded-2xl border border-white/10 bg-panel p-5 shadow-magenta">
      {bet.handlesPublic && (bet.xCreatorHandle || bet.xOpponentHandle) ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {bet.xCreatorHandle ? <HandleBadge handle={bet.xCreatorHandle} /> : null}
          <span className="text-white/50">vs</span>
          {bet.xOpponentHandle ? <HandleBadge handle={bet.xOpponentHandle} /> : <span className="text-white/40">TBD</span>}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-white">{bet.title}</h3>
      <p className="mt-1 text-sm text-white/70">{formatTemplate(bet)}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-white/70">
        <div>
          <p>Stake / side</p>
          <p className="text-sm font-semibold text-neon">{bet.stakePerSide.toString()} {bet.currencyLabel}</p>
        </div>
        <div>
          <p>Total pot</p>
          <p className="text-sm font-semibold text-neon">{pot} {bet.currencyLabel}</p>
        </div>
        <div>
          <p>Resolves</p>
          <p className="text-sm font-semibold text-white">{formatDateUtc(bet.resolveAt)}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70">{bet.status}</span>
        <Link
          className="rounded-full bg-neon/20 px-4 py-2 text-xs font-semibold text-neon transition hover:bg-neon/30"
          href={`/bets/${bet.id}`}
        >
          {bet.status === 'OPEN' ? 'Take bet' : 'View'}
        </Link>
      </div>
    </article>
  );
}
