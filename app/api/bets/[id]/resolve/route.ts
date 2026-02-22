import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeOutcome, simulateOracleValue } from '@/lib/resolver';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const bet = await prisma.bet.findUnique({ where: { id: params.id }, include: { resolution: true } });
  if (!bet) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (bet.status !== 'MATCHED') return NextResponse.json({ error: 'Only matched bets can resolve' }, { status: 400 });

  const oracleValue = simulateOracleValue(bet.id);
  const outcome = computeOutcome(
    bet.templateType,
    oracleValue,
    bet.threshold ? Number(bet.threshold) : null,
    bet.lowerBound ? Number(bet.lowerBound) : null,
    bet.upperBound ? Number(bet.upperBound) : null
  );

  await prisma.$transaction([
    prisma.bet.update({ where: { id: bet.id }, data: { status: 'RESOLVED', outcome } }),
    prisma.resolution.upsert({
      where: { betId: bet.id },
      create: {
        betId: bet.id,
        resolvedAt: new Date(),
        oracleValue: new Prisma.Decimal(oracleValue),
        notes: 'Simulated deterministic oracle resolution for MVP UI.'
      },
      update: {
        resolvedAt: new Date(),
        oracleValue: new Prisma.Decimal(oracleValue),
        notes: 'Simulated deterministic oracle resolution for MVP UI.'
      }
    })
  ]);

  return NextResponse.redirect(new URL(`/bets/${params.id}`, req.url));
}
