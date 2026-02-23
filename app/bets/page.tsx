import { BetCard } from '@/components/bet-card';
import { betsCatalog } from '@/lib/betsCatalog';
import { BetStatus, labelForTemplate, statusOptions, TemplateType, templateOptions } from '@/lib/types';

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
      <form className="grid gap-3 rounded-lg border border-white/15 bg-panel/95 p-4 shadow-glow md:grid-cols-5">
        <select name="status" defaultValue={searchParams.status ?? ''} className="rounded-md border border-white/15 bg-bg p-2 text-sm hover:border-magenta/45 focus-visible:border-neon/45">
          <option value="">All statuses</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="templateType" defaultValue={searchParams.templateType ?? ''} className="rounded-md border border-white/15 bg-bg p-2 text-sm hover:border-magenta/45 focus-visible:border-neon/45">
          <option value="">All templates</option>
          {templateOptions.map((t) => <option key={t} value={t}>{labelForTemplate[t]}</option>)}
        </select>
        <input name="minStake" type="number" step="0.01" min="0" defaultValue={searchParams.minStake ?? ''} placeholder="Min stake" className="rounded-md border border-white/15 bg-bg p-2 text-sm hover:border-magenta/45 focus-visible:border-neon/45" />
        <select name="window" defaultValue={searchParams.window ?? ''} className="rounded-md border border-white/15 bg-bg p-2 text-sm hover:border-magenta/45 focus-visible:border-neon/45">
          <option value="">Any resolve time</option>
          <option value="24h">Next 24h</option>
          <option value="7d">Next 7d</option>
          <option value="30d">Next 30d</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input name="hasHandles" type="checkbox" value="true" defaultChecked={searchParams.hasHandles === 'true'} /> Has handles
        </label>
        <button className="rounded-md border border-neon/30 bg-neon/20 px-4 py-2 font-semibold text-neon hover:bg-neon/30 hover:border-neon/50 md:col-span-5 md:justify-self-start">Apply filters</button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {bets.length === 0 ? <p className="text-white/70">No bets match filters.</p> : bets.map((bet) => <BetCard key={bet.id} bet={bet} />)}
      </div>
    </div>
  );
}
