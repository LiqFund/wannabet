import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const formData = await req.formData();
  const takerAddress = formData.get('takerAddress')?.toString();
  if (!takerAddress) return NextResponse.json({ error: 'Taker required' }, { status: 400 });

  await prisma.bet.update({
    where: { id: params.id, status: 'OPEN' },
    data: { takerAddress, status: 'MATCHED' }
  });

  return NextResponse.redirect(new URL(`/bets/${params.id}`, req.url));
}
