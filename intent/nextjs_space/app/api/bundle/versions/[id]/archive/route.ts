import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrApiKey } from '@/lib/api-auth';
import { archiveVersion } from '@/lib/agent';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionOrApiKey(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const versionId = params.id;

  // Only ADMIN can archive (soft-hide)
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can archive versions' }, { status: 403 });
  }

  const version = await prisma.bundleVersion.findUnique({
    where: { id: versionId },
    select: { bundle: { select: { intentId: true } } },
  });
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

  await archiveVersion(versionId);
  return NextResponse.json({ ok: true });
}