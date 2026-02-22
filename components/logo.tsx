import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="inline-flex flex-col leading-none">
      <p className="text-xl font-black tracking-[0.25em] text-white">WANNA BET?</p>
      <p className="font-cursive text-sm text-gold">By Malleable Gold</p>
    </Link>
  );
}
