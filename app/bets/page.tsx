import { BetCard } from '@/components/bet-card';
import { betsCatalog } from '@/lib/betsCatalog';
import { BetStatus, statusOptions, TemplateType, templateOptions } from '@/lib/types';
import { BetsFilters } from '@/components/BetsFilters';

export const metadata = {
  title: 'Browse bets | wannabet.you',
  openGraph: { title: 'Browse bets | wannabet.you', description: 'Open and matched oracle escrow bets.' }
};

const resolveWindowMap: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30 };

export default async function BetsPage({
  searchParams
}: {
  searchParams: {
    status?: BetStatus;
    templateType?: TemplateType;
    minStake?: string;
    window?: keyof typeof resolveWindowMap;
    hasHandles?: string;
  };
}) {
  const minStake = searchParams.minStake ? Number(searchParams.minStake) : null;

  const bets = betsCatalog
    .filter((bet) => {
      if (searchParams.status && statusOptions.includes(searchParams.status) && bet.status !== searchParams.status) return false;
      if (searchParams.templateType && templateOptions.includes(searchParams.templateType) && bet.templateType !== searchParams.templateType) return false;
      if (minStake != null && !Number.isNaN(minStake) && bet.stakePerSide < minStake) return false;
      if (searchParams.hasHandles === 'true' && !(bet.handlesPublic && (bet.xCreatorHandle || bet.xOpponentHandle))) return false;
      if (searchParams.window && resolveWindowMap[searchParams.window]) {
        const now = new Date();
        const end = new Date();
        end.setDate(now.getDate() + resolveWindowMap[searchParams.window]);
        if (bet.resolveAt < now || bet.resolveAt > end) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black tracking-tight">Browse Bets</h1>
      <BetsFilters
        defaultStatus={searchParams.status}
        defaultTemplateType={searchParams.templateType}
        defaultMinStake={searchParams.minStake}
        defaultWindow={searchParams.window as '24h' | '7d' | '30d' | undefined}
        defaultHasHandles={searchParams.hasHandles === 'true'}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {bets.length === 0 ? <p className="text-white/70">No bets match filters.</p> : bets.map((bet) => <BetCard key={bet.id} bet={bet} />)}
      </div>
    </div>
  );
}
