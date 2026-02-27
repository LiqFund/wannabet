import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Wanna Bet? │ The worlds leading head to head betting platform',
  description: 'Challenge anyone to a direct bet. Lock the terms. Escrow the funds. Settle by oracle data.',
  openGraph: {
    title: 'wannabet.you',
    description: 'Head to head bets with immutable terms and oracle settlement. Winner takes all.',
    type: 'website',
    url: 'https://wannabet.you',
    siteName: 'Wanna Bet?'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 md:px-6 md:py-10">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
