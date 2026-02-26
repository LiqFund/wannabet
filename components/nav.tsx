import Link from 'next/link';
import { Logo } from './logo';

export function Nav() {
  return (
    <header className="border-b border-white/15 bg-bg/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-6 md:py-5">
        <Logo />
        <nav className="hidden gap-5 text-sm text-white/90 md:flex [&_a]:tracking-wide [&_a]:transition">
          <Link href="/" className="hover:text-gold">
            Home
          </Link>
          <Link href="/bets" className="hover:text-gold">
            Browse
          </Link>
          <Link href="/create" className="hover:text-gold">
            Create
          </Link>
        </nav>
        <button
          type="button"
          disabled
          className="rounded-md border border-neon/50 bg-neon/10 px-3 py-2 text-[11px] font-semibold tracking-wide text-neon opacity-80 md:px-4 md:text-xs"
        >
          Connect (soon)
        </button>
      </div>
    </header>
  );
}
