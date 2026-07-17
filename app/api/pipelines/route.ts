import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get('seasonId');
  if (!seasonId) return NextResponse.json({ error: 'seasonId required' }, { status: 400 });

  const rows = await prisma.teamPipeline.findMany({
    where: { seasonId },
    include: { team: { select: { name: true, conference: true, logoUrl: true } } },
    orderBy: [{ team: { name: 'asc' } }, { value: 'desc' }],
  });

  return NextResponse.json(rows);
}
