import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/15 py-8 text-sm text-white/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4 [&_a]:transition [&_a]:hover:text-gold">
          <Link href="/">Home</Link>
          <Link href="/create">Create bet</Link>
        </div>
        <p>
          Oracle-only escrow contracts. No custody. For informational purposes. Jurisdiction restrictions may apply.
        </p>
      </div>
    </footer>
  );
}
