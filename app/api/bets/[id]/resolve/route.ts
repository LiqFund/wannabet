import { NextResponse } from 'next/server';
import { Prisma, TemplateType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeOutcome, simulateOracleValue } from '@/lib/resolver';

const TEMPLATE_TYPE_ALLOWLIST: readonly TemplateType[] = [
  'PRICE_ABOVE_BELOW',
  'PRICE_RANGE',
  'SPORTS_WINNER',
  'SPORTS_OU'
] as const;

const isTemplateType = (value: string): value is TemplateType => TEMPLATE_TYPE_ALLOWLIST.some((templateType) => templateType === value);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const bet = await prisma.bet.findUnique({ where: { id: params.id }, include: { resolution: true } });
  if (!bet) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (bet.status !== 'MATCHED') return NextResponse.json({ error: 'Only matched bets can resolve' }, { status: 400 });
  if (!isTemplateType(bet.templateType)) {
    return NextResponse.json(
      { error: `Invalid templateType '${bet.templateType}'. Allowed values: ${TEMPLATE_TYPE_ALLOWLIST.join(', ')}` },
      { status: 400 }
    );
  }

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
