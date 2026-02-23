'use client';

import { FormEvent, useMemo, useState } from 'react';
import { labelForTemplate, TemplateType } from '@/lib/types';

const defaultResolve = new Date(Date.now() + 86400000).toISOString().slice(0, 16);

export default function CreatePage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    templateType: 'PRICE_ABOVE_BELOW' as TemplateType,
    assetBase: 'BTC',
    assetQuote: 'USD',
    threshold: '100000',
    lowerBound: '90000',
    upperBound: '120000',
    resolveAt: defaultResolve,
    stakePerSide: '100',
    currencyLabel: 'USDC',
    creatorAddress: '',
    xCreatorHandle: '',
    xOpponentHandle: '',
    handlesPublic: false
  });

  const preview = useMemo(() => {
    if (form.templateType === 'PRICE_RANGE') {
      return `${form.assetBase}/${form.assetQuote} in [${form.lowerBound}, ${form.upperBound}] at ${form.resolveAt}`;
    }
    if (form.templateType === 'PRICE_ABOVE_BELOW') {
      return `${form.assetBase}/${form.assetQuote} > ${form.threshold} at ${form.resolveAt}`;
    }
    return 'Coming soon template';
  }, [form]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    window.setTimeout(() => setLoading(false), 400);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-panel p-5 lg:col-span-2">
        <h1 className="text-3xl font-black">Create Bet</h1>
        <p className="text-sm text-white/60">Oracle-only escrow contracts. Non custodial. Jurisdiction restrictions may apply.</p>

        <input required placeholder="Bet title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded bg-bg p-2" />
        <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-24 w-full rounded bg-bg p-2" />

        <div className="grid gap-2 md:grid-cols-2">
          <select value={form.templateType} onChange={(e) => setForm({ ...form, templateType: e.target.value as TemplateType })} className="rounded bg-bg p-2">
            {(Object.keys(labelForTemplate) as TemplateType[]).map((t) => <option key={t} value={t}>{labelForTemplate[t]}</option>)}
          </select>
          <input value={form.resolveAt} type="datetime-local" onChange={(e) => setForm({ ...form, resolveAt: e.target.value })} className="rounded bg-bg p-2" />
          <input value={form.assetBase} onChange={(e) => setForm({ ...form, assetBase: e.target.value.toUpperCase() })} placeholder="Base" className="rounded bg-bg p-2" />
          <input value={form.assetQuote} onChange={(e) => setForm({ ...form, assetQuote: e.target.value.toUpperCase() })} placeholder="Quote" className="rounded bg-bg p-2" />
        </div>

        {form.templateType === 'PRICE_ABOVE_BELOW' ? (
          <input type="number" min="0" step="0.01" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} placeholder="Threshold" className="w-full rounded bg-bg p-2" />
        ) : null}
        {form.templateType === 'PRICE_RANGE' ? (
          <div className="grid gap-2 md:grid-cols-2">
            <input type="number" min="0" step="0.01" value={form.lowerBound} onChange={(e) => setForm({ ...form, lowerBound: e.target.value })} placeholder="Lower bound" className="rounded bg-bg p-2" />
            <input type="number" min="0" step="0.01" value={form.upperBound} onChange={(e) => setForm({ ...form, upperBound: e.target.value })} placeholder="Upper bound" className="rounded bg-bg p-2" />
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-2">
          <input required type="number" min="0.01" step="0.01" value={form.stakePerSide} onChange={(e) => setForm({ ...form, stakePerSide: e.target.value })} placeholder="Stake per side" className="rounded bg-bg p-2" />
          <select value={form.currencyLabel} onChange={(e) => setForm({ ...form, currencyLabel: e.target.value })} className="rounded bg-bg p-2">
            <option value="USDC">USDC</option>
            <option value="SOL">SOL</option>
          </select>
          <input required value={form.creatorAddress} onChange={(e) => setForm({ ...form, creatorAddress: e.target.value })} placeholder="Creator wallet address" className="rounded bg-bg p-2 md:col-span-2" />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <input value={form.xCreatorHandle} onChange={(e) => setForm({ ...form, xCreatorHandle: e.target.value.replace('@', '') })} placeholder="Creator X handle" className="rounded bg-bg p-2" />
          <input value={form.xOpponentHandle} onChange={(e) => setForm({ ...form, xOpponentHandle: e.target.value.replace('@', '') })} placeholder="Opponent X handle" className="rounded bg-bg p-2" />
        </div>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={form.handlesPublic} onChange={(e) => setForm({ ...form, handlesPublic: e.target.checked })} /> Publicly show handles
        </label>

        <button disabled={loading} className="rounded-full bg-neon/20 px-5 py-3 font-semibold text-neon disabled:opacity-60">{loading ? 'Saving draft...' : 'Save local draft'}</button>
        <p className="text-xs text-white/60"></p>
      </form>

      <aside className="rounded-2xl border border-white/10 bg-panel p-5">
        <h2 className="text-xl font-bold text-neon">Live Preview</h2>
        <p className="mt-3 text-sm text-white/80">{form.title || 'Untitled bet'}</p>
        <p className="mt-2 text-xs text-white/70">{preview}</p>
        <p className="mt-2 text-xs text-white/70">Stake: {form.stakePerSide || '0'} {form.currencyLabel}</p>
      </aside>
    </div>
  );
}
