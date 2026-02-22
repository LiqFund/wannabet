export function HandleBadge({ handle }: { handle: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-magenta/10 px-3 py-1 text-xs text-magenta">
      @{handle}
      <span className="rounded-full border border-magenta/60 px-2 py-0.5 text-[10px] uppercase tracking-wide">Unverified</span>
    </span>
  );
}
