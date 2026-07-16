import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const seasonId = new URL(request.url).searchParams.get('seasonId');
  if (!seasonId) return Response.json({ error: 'Missing seasonId' }, { status: 400 });

  const settings = await prisma.seasonSettings.findUnique({ where: { seasonId } });
  return Response.json(settings);
}
