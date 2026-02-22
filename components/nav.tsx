import Link from 'next/link';
import { Logo } from './logo';

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="transition hover:opacity-80">
          <Logo />
        </Link>
        <nav className="hidden gap-5 text-sm text-white/90 md:flex">
          <Link href="/">Home</Link>
          <Link href="/bets">Browse</Link>
          <Link href="/create">Create</Link>
        </nav>
        <button
          type="button"
          disabled
          className="rounded-full border border-neon/60 px-4 py-2 text-xs font-semibold text-neon opacity-80"
        >
          Connect (soon)
        </button>
      </div>
    </header>
  );
}
