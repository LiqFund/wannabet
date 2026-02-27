'use client';

import { useState } from 'react';
import { UnifiedSelect } from '@/components/ui/UnifiedSelect';
import { BetStatus, labelForTemplate, statusOptions, TemplateType, templateOptions } from '@/lib/types';

type Props = {
  defaultStatus?: BetStatus;
  defaultTemplateType?: TemplateType;
  defaultMinStake?: string;
  defaultWindow?: '24h' | '7d' | '30d';
  defaultHasHandles?: boolean;
};

export function BetsFilters({
  defaultStatus,
  defaultTemplateType,
  defaultMinStake,
  defaultWindow,
  defaultHasHandles
}: Props) {
  const [status, setStatus] = useState(defaultStatus ?? '');
  const [templateType, setTemplateType] = useState(defaultTemplateType ?? '');
  const [windowValue, setWindowValue] = useState(defaultWindow ?? '');

  return (
    <form className="grid gap-3 rounded-lg border border-white/15 bg-panel/95 p-4 shadow-glow md:grid-cols-5">
      <UnifiedSelect
        name="status"
        value={status}
        onValueChange={setStatus}
        options={[{ value: '', label: 'All statuses' }, ...statusOptions.map((s) => ({ value: s, label: s }))]}
        widthClassName="w-full"
      />
      <UnifiedSelect
        name="templateType"
        value={templateType}
        onValueChange={setTemplateType}
        options={[{ value: '', label: 'All templates' }, ...templateOptions.map((t) => ({ value: t, label: labelForTemplate[t] }))]}
        widthClassName="w-full"
      />
      <input name="minStake" type="number" step="0.01" min="0" defaultValue={defaultMinStake ?? ''} placeholder="Min stake" className="rounded-md border border-white/15 bg-bg p-2 text-sm hover:border-magenta/45 focus-visible:border-neon/45" />
      <UnifiedSelect
        name="window"
        value={windowValue}
        onValueChange={setWindowValue}
        options={[
          { value: '', label: 'Any resolve time' },
          { value: '24h', label: 'Next 24h' },
          { value: '7d', label: 'Next 7d' },
          { value: '30d', label: 'Next 30d' }
        ]}
        widthClassName="w-full"
      />
      <label className="flex items-center gap-2 text-sm">
        <input name="hasHandles" type="checkbox" value="true" defaultChecked={defaultHasHandles} /> Has handles
      </label>
      <button className="rounded-md border border-neon/30 bg-neon/20 px-4 py-2 font-semibold text-neon hover:bg-neon/30 hover:border-neon/50 md:col-span-5 md:justify-self-start">Apply filters</button>
    </form>
  );
}
