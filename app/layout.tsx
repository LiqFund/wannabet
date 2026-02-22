import type { Metadata } from 'next';
import { Kaushan_Script, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });
const kaushanScript = Kaushan_Script({ subsets: ['latin'], weight: '400', variable: '--font-kaushan-script' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'wannabet.you | Oracle-only escrow bets',
  description: 'Peer-to-peer oracle-only escrow bet templates with immutable rules.',
  openGraph: {
    title: 'wannabet.you',
    description: 'Non-custodial oracle-only escrow bets.',
    type: 'website'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${kaushanScript.variable}`}>
      <body>
        <Nav />
        <main className="mx-auto min-h-screen max-w-6xl px-4 py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
