import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrApiKey } from '@/lib/api-auth';
import { restoreAsDraft } from '@/lib/agent';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionOrApiKey(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const versionId = params.id;

  // RBAC: verify the version's bundle belongs to an intent the user can access
  const version = await prisma.bundleVersion.findUnique({
    where: { id: versionId },
    include: { bundle: { select: { intentId: true } } },
  });
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  if (user.role === 'END_USER') {
    const intent = await prisma.intent.findUnique({ where: { id: version.bundle.intentId }, select: { requesterId: true } });
    if (!intent || intent.requesterId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const newDraftId = await restoreAsDraft(versionId, { by: user.id });
  return NextResponse.json({ versionId: newDraftId });
}