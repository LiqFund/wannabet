export function HandleBadge({ handle }: { handle: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-magenta/40 bg-magenta/10 px-3 py-1 text-xs font-medium tracking-wide text-magenta">
      @{handle}
      <span className="rounded-md border border-magenta/60 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">Unverified</span>
    </span>
  );
}
