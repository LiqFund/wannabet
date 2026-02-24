'use client';

import { FormEvent, useMemo, useState } from 'react';

type Sector = 'CRYPTO' | 'FINANCE' | 'SPORTS';
type CryptoTemplate = 'PRICE_ABOVE_BELOW' | 'PRICE_RANGE' | 'PERCENT_MOVE';
type Direction = 'ABOVE' | 'BELOW' | 'UP' | 'DOWN';
type Asset = 'BTC' | 'ETH' | 'SOL';

type CreateFormState = {
  title: string;
  description: string;
  sector: Sector;
  templateType: CryptoTemplate;
  assetBase: Asset;
  assetQuote: 'USD';
  resolveAtIso: string;
  startAtIso: string;
  endAtIso: string;
  direction: Direction;
  strikePrice: string;
  lowerBound: string;
  upperBound: string;
  thresholdPercent: string;
  stakePerSide: string;
  currencyLabel: 'USDC';
  creatorAddress: string;
  xCreatorHandle: string;
  handlesPublic: boolean;
};

const labels = {
  sector: 'Sector',
  template: 'Template',
  asset: 'Asset',
  quote: 'Quote',
  resolveAt: 'Resolve at (UTC)',
  startAt: 'Start (UTC)',
  endAt: 'End (UTC)',
  direction: 'Direction',
  strikePrice: 'Strike price',
  lowerBound: 'Lower bound',
  upperBound: 'Upper bound',
  thresholdPercent: 'Threshold %',
  amount: 'Amount',
  collateralToken: 'Collateral token',
  creatorWallet: 'Creator wallet (connect to set)',
  creatorX: 'Creator X handle',
  showHandles: 'Publicly show handles'
} as const;

const templateLabels: Record<CryptoTemplate, string> = {
  PRICE_ABOVE_BELOW: 'Price Above/Below at Expiry',
  PRICE_RANGE: 'Price Range at Expiry',
  PERCENT_MOVE: '% Move Over Window'
};

const defaultResolveIso = new Date(Date.now() + 86400000).toISOString();
const defaultEndIso = new Date(Date.now() + 172800000).toISOString();

function toLocalInputValue(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function fromLocalInputValue(localValue: string): string {
  if (!localValue) return '';
  return new Date(localValue).toISOString();
}

function formatUtcLabel(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

function formatLocalLabel(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function formatBetLine(form: CreateFormState): string {
  const pair = `${form.assetBase}/${form.assetQuote}`;

  if (form.templateType === 'PRICE_ABOVE_BELOW') {
    const operator = form.direction === 'BELOW' ? '<' : '>';
    return `${pair} ${operator} ${form.strikePrice || '0'} at ${formatUtcLabel(form.resolveAtIso)}`;
  }

  if (form.templateType === 'PRICE_RANGE') {
    return `${pair} in [${form.lowerBound || '0'}, ${form.upperBound || '0'}] at ${formatUtcLabel(form.resolveAtIso)}`;
  }

  const direction = form.direction === 'DOWN' ? 'down' : 'up';
  return `${pair} ${direction} ${form.thresholdPercent || '0'}% from ${formatUtcLabel(form.startAtIso)} to ${formatUtcLabel(form.endAtIso)}`;
}

export default function CreatePage() {
  const [loading, setLoading] = useState(false);
  const [xConnected, setXConnected] = useState(false);
  const [form, setForm] = useState<CreateFormState>({
    title: '',
    description: '',
    sector: 'CRYPTO',
    templateType: 'PRICE_ABOVE_BELOW',
    assetBase: 'BTC',
    assetQuote: 'USD',
    resolveAtIso: defaultResolveIso,
    startAtIso: defaultResolveIso,
    endAtIso: defaultEndIso,
    direction: 'ABOVE',
    strikePrice: '100000',
    lowerBound: '90000',
    upperBound: '120000',
    thresholdPercent: '5.0',
    stakePerSide: '100',
    currencyLabel: 'USDC',
    creatorAddress: '',
    xCreatorHandle: '',
    handlesPublic: false
  });

  const numeric = {
    strikePrice: Number(form.strikePrice),
    lowerBound: Number(form.lowerBound),
    upperBound: Number(form.upperBound),
    thresholdPercent: Number(form.thresholdPercent),
    stakePerSide: Number(form.stakePerSide),
    startAt: form.startAtIso ? new Date(form.startAtIso).getTime() : NaN,
    endAt: form.endAtIso ? new Date(form.endAtIso).getTime() : NaN
  };

  const errors = {
    sector: form.sector !== 'CRYPTO',
    assetBase: !form.assetBase,
    stakePerSide: !(numeric.stakePerSide > 0),
    resolveAtIso: !form.resolveAtIso,
    startAtIso: !form.startAtIso,
    endAtIso: !form.endAtIso,
    strikePrice: !(numeric.strikePrice > 0),
    lowerBound: !(numeric.lowerBound > 0),
    upperBound: !(numeric.upperBound > 0) || !(numeric.lowerBound < numeric.upperBound),
    thresholdPercent: !(numeric.thresholdPercent > 0),
    window: !(numeric.endAt > numeric.startAt)
  };

  const preview = useMemo(() => formatBetLine(form), [form]);

  const inputClass = (invalid: boolean) =>
    `w-full rounded-md border bg-bg p-2 hover:border-magenta/45 focus-visible:border-neon/45 ${invalid ? 'border-red-500/80' : 'border-white/15'}`;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    window.setTimeout(() => setLoading(false), 400);
  };

  const onConnectX = () => {
    console.log('Connect X clicked');
    setXConnected(true);
    setForm((prev) => ({ ...prev, xCreatorHandle: prev.xCreatorHandle || 'creator_handle' }));
  };

  const showHandles = form.handlesPublic && xConnected && form.xCreatorHandle.trim();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-white/15 bg-panel/95 p-5 shadow-glow lg:col-span-2">
        <h1 className="text-3xl font-black tracking-tight">Create Bet</h1>
        <p className="text-sm text-white/60">Oracle-only escrow contracts. Non custodial. Jurisdiction restrictions may apply.</p>

        <input required placeholder="Bet title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border border-white/15 bg-bg p-2 hover:border-magenta/45 focus-visible:border-neon/45" />
        <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-24 w-full rounded-md border border-white/15 bg-bg p-2 hover:border-magenta/45 focus-visible:border-neon/45" />

        <div className="space-y-2">
          <label className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.sector}</span>
            <select value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value as Sector })} className={inputClass(errors.sector)}>
              <option value="CRYPTO">Crypto</option>
              <option value="FINANCE" disabled title="Unavailable">Finance</option>
              <option value="SPORTS" disabled title="Unavailable">Sports</option>
            </select>
          </label>
          <label className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.template}</span>
            <select value={form.templateType} onChange={(e) => setForm({ ...form, templateType: e.target.value as CryptoTemplate, direction: e.target.value === 'PERCENT_MOVE' ? 'UP' : 'ABOVE' })} className={inputClass(false)}>
              {(Object.keys(templateLabels) as CryptoTemplate[]).map((t) => <option key={t} value={t}>{templateLabels[t]}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.asset}</span>
            <select value={form.assetBase} onChange={(e) => setForm({ ...form, assetBase: e.target.value as Asset })} className={inputClass(errors.assetBase)}>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="SOL">SOL</option>
            </select>
          </label>
          <label className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.quote}</span>
            <input value={form.assetQuote} readOnly aria-readonly className="w-full rounded-md border border-white/15 bg-bg/70 p-2 text-white/85" />
          </label>
        </div>

        {form.templateType !== 'PERCENT_MOVE' ? (
          <label className="flex items-start gap-3">
            <span className="w-40 shrink-0 pt-2 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.resolveAt}</span>
            <div className="w-full">
              <input value={toLocalInputValue(form.resolveAtIso)} type="datetime-local" onChange={(e) => setForm({ ...form, resolveAtIso: fromLocalInputValue(e.target.value) })} className={inputClass(errors.resolveAtIso)} />
              <p className="pt-1 text-xs text-white/60">{formatLocalLabel(form.resolveAtIso)}</p>
            </div>
          </label>
        ) : (
          <div className="space-y-2">
            <label className="flex items-start gap-3">
              <span className="w-40 shrink-0 pt-2 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.startAt}</span>
              <div className="w-full">
                <input value={toLocalInputValue(form.startAtIso)} type="datetime-local" onChange={(e) => setForm({ ...form, startAtIso: fromLocalInputValue(e.target.value) })} className={inputClass(errors.startAtIso || errors.window)} />
                <p className="pt-1 text-xs text-white/60">{formatLocalLabel(form.startAtIso)}</p>
              </div>
            </label>
            <label className="flex items-start gap-3">
              <span className="w-40 shrink-0 pt-2 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.endAt}</span>
              <div className="w-full">
                <input value={toLocalInputValue(form.endAtIso)} type="datetime-local" onChange={(e) => setForm({ ...form, endAtIso: fromLocalInputValue(e.target.value) })} className={inputClass(errors.endAtIso || errors.window)} />
                <p className="pt-1 text-xs text-white/60">{formatLocalLabel(form.endAtIso)}</p>
              </div>
            </label>
          </div>
        )}

        {form.templateType === 'PRICE_ABOVE_BELOW' ? (
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.direction}</span>
              <select value={form.direction === 'BELOW' ? 'BELOW' : 'ABOVE'} onChange={(e) => setForm({ ...form, direction: e.target.value as Direction })} className={inputClass(false)}>
                <option value="ABOVE">Above</option>
                <option value="BELOW">Below</option>
              </select>
            </label>
            <label className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.strikePrice}</span>
              <input type="number" min="0" step="0.01" value={form.strikePrice} onChange={(e) => setForm({ ...form, strikePrice: e.target.value })} className={inputClass(errors.strikePrice)} />
            </label>
          </div>
        ) : null}

        {form.templateType === 'PRICE_RANGE' ? (
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.lowerBound}</span>
              <input type="number" min="0" step="0.01" value={form.lowerBound} onChange={(e) => setForm({ ...form, lowerBound: e.target.value })} className={inputClass(errors.lowerBound || errors.upperBound)} />
            </label>
            <label className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.upperBound}</span>
              <input type="number" min="0" step="0.01" value={form.upperBound} onChange={(e) => setForm({ ...form, upperBound: e.target.value })} className={inputClass(errors.upperBound)} />
            </label>
          </div>
        ) : null}

        {form.templateType === 'PERCENT_MOVE' ? (
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.direction}</span>
              <select value={form.direction === 'DOWN' ? 'DOWN' : 'UP'} onChange={(e) => setForm({ ...form, direction: e.target.value as Direction })} className={inputClass(false)}>
                <option value="UP">Up</option>
                <option value="DOWN">Down</option>
              </select>
            </label>
            <label className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.thresholdPercent}</span>
              <input type="number" min="0" step="0.1" value={form.thresholdPercent} onChange={(e) => setForm({ ...form, thresholdPercent: e.target.value })} className={inputClass(errors.thresholdPercent)} />
            </label>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.amount}</span>
            <input required type="number" min="0.01" step="0.01" value={form.stakePerSide} onChange={(e) => setForm({ ...form, stakePerSide: e.target.value })} className={inputClass(errors.stakePerSide)} />
          </label>
          <label className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.collateralToken}</span>
            <select value={form.currencyLabel} className="w-full rounded-md border border-white/15 bg-bg p-2 text-white/90" disabled>
              <option value="USDC">USDC</option>
            </select>
          </label>
          <label className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.creatorWallet}</span>
            <input value={form.creatorAddress} disabled className="w-full rounded-md border border-white/15 bg-bg/70 p-2 text-white/70" />
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-white/75">{labels.creatorX}</span>
            <button type="button" onClick={onConnectX} className="w-full rounded-md border border-white/15 bg-bg p-2 text-left text-white/85 hover:border-magenta/45 focus-visible:border-neon/45">
              Connect X
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={form.handlesPublic} onChange={(e) => setForm({ ...form, handlesPublic: e.target.checked })} /> {labels.showHandles}
        </label>

        <button disabled={loading} className="rounded-md border border-neon/30 bg-neon/20 px-5 py-3 font-semibold text-neon hover:border-neon/50 hover:bg-neon/30 disabled:opacity-60">{loading ? 'Saving...' : 'Create Bet'}</button>
      </form>

      <aside className="rounded-lg border border-white/15 bg-panel/95 p-5 shadow-magenta">
        <h2 className="text-xl font-bold tracking-tight text-neon">Live Preview</h2>
        <p className="mt-3 text-sm text-white/80">{form.title || 'Untitled bet'}</p>
        <p className="mt-3 text-xs uppercase tracking-wide text-white/70">{labels.sector}: {form.sector}</p>
        <p className="mt-1 text-xs text-white/70">{labels.template}: {templateLabels[form.templateType]}</p>
        <p className="mt-2 text-xs text-white/80">{preview}</p>
        <p className="mt-2 text-xs text-white/70">Stake: {form.stakePerSide || '0'} {form.currencyLabel}</p>
        {showHandles ? <p className="mt-2 text-xs text-white/70">@{form.xCreatorHandle.trim()}</p> : null}
      </aside>
    </div>
  );
}
