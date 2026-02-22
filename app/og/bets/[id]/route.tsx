import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import { formatTemplate } from '@/lib/format';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const bet = await prisma.bet.findUnique({ where: { id: params.id } });

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#050509',
          color: 'white',
          padding: '56px',
          border: '2px solid rgba(92,249,255,0.4)'
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 4 }}>WANNABET</div>
        <div style={{ fontSize: 54, fontWeight: 800 }}>{bet?.title ?? 'Bet detail'}</div>
        <div style={{ fontSize: 28, color: '#5cf9ff' }}>{bet ? formatTemplate(bet) : 'Oracle-only escrow bets'}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
