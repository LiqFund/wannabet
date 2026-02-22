import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const body = await req.json();
  const templateType = body.templateType;

  if (!body.title || !body.description || !body.creatorAddress) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const stake = Number(body.stakePerSide);
  if (Number.isNaN(stake) || stake <= 0) return NextResponse.json({ error: 'Invalid stake' }, { status: 400 });

  const payload: Prisma.BetCreateInput = {
    title: body.title,
    description: body.description,
    templateType,
    assetBase: body.assetBase,
    assetQuote: body.assetQuote,
    threshold: body.threshold ? new Prisma.Decimal(body.threshold) : null,
    lowerBound: body.lowerBound ? new Prisma.Decimal(body.lowerBound) : null,
    upperBound: body.upperBound ? new Prisma.Decimal(body.upperBound) : null,
    resolveAt: new Date(body.resolveAt),
    stakePerSide: new Prisma.Decimal(body.stakePerSide),
    currencyLabel: body.currencyLabel,
    creatorAddress: body.creatorAddress,
    xCreatorHandle: body.xCreatorHandle || null,
    xOpponentHandle: body.xOpponentHandle || null,
    handlesPublic: Boolean(body.handlesPublic),
    oracleSource: templateType.startsWith('SPORTS') ? 'Sports oracle metadata (coming soon)' : `Chainlink price feed: ${body.assetBase}/${body.assetQuote}`
  };

  const bet = await prisma.bet.create({ data: payload });
  return NextResponse.json({ id: bet.id });
}
