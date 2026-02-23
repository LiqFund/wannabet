import Link from 'next/link';
import { Logo } from './logo';

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-6 md:py-5">
        <Logo />
        <nav className="hidden gap-5 text-sm text-white/90 md:flex">
          <Link href="/">Home</Link>
          <Link href="/bets">Browse</Link>
          <Link href="/create">Create</Link>
        </nav>
        <button
          type="button"
          disabled
          className="rounded-full border border-neon/60 px-3 py-2 text-[11px] font-semibold text-neon opacity-80 md:px-4 md:text-xs"
        >
          Connect (soon)
        </button>
      </div>
    </header>
  );
}
