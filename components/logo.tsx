import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-4">
      <img src="/icon.ico" alt="Wannabet logo" className="h-[64px] w-auto" />
      <div className="flex flex-col leading-tight">
        <p className="text-xl font-black tracking-[0.2em] text-white">WANNA BET?</p>
        <p className="font-cursive text-sm italic text-gold [text-shadow:0_0_10px_rgba(220,68,188,0.45)]">By Malleable Gold</p>
      </div>
    </Link>
  );
}
