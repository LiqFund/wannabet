import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Wanna Bet? - Head to head betting.',
  description: 'Put your money where your mouth is. Head to head bets with immutable terms and oracle settlement. Winner takes all.',
  openGraph: {
    title: 'wannabet.you',
    description: '1v1 head to head betting. Winner takes all. Wanna bet?',
    type: 'website'
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 md:px-6 md:py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
