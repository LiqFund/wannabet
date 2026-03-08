'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Logo } from './logo';

export function Nav() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b border-white/15 bg-bg/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-6 md:py-5">
        <Logo />
        <nav className="hidden gap-5 text-sm text-white/90 md:flex [&_a]:tracking-wide [&_a]:transition">
          <Link href="/" className="hover:text-gold">
            Home
          </Link>
          <Link href="/create" className="hover:text-gold">
            Create
          </Link>
          <Link href="/my-bets" className="hover:text-gold">
            My Bets
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="https://bags.fm/9FhkPgLc5NqYhj1yHVyJkukjB2jrTjZfcUUk1n87BAGS"
            target="_blank"
            rel="noreferrer noopener"
            className="wannabet-token-button rounded-md border px-3 py-2 text-[11px] font-semibold tracking-wide opacity-80 md:px-4 md:text-xs"
          >
            INVEST
          </a>
          {mounted ? (
            <WalletMultiButton className="!h-auto !rounded-md !border !border-neon/50 !bg-neon/10 !px-3 !py-2 !text-[11px] !font-semibold !tracking-wide !text-neon md:!px-4 md:!text-xs" />
          ) : (
            <div className="h-[38px] w-[132px] rounded-md border border-neon/50 bg-neon/10 md:w-[148px]" />
          )}
        </div>
      </div>
    </header>
  );
}
