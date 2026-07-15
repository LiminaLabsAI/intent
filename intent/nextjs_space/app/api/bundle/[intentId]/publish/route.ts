import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrApiKey } from '@/lib/api-auth';
import { publishDraft } from '@/lib/agent';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { intentId: string } }) {
  const user = await getSessionOrApiKey(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const intentId = params.intentId;
  if (user.role === 'END_USER') {
    const intent = await prisma.intent.findUnique({ where: { id: intentId }, select: { requesterId: true } });
    if (!intent || intent.requesterId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name : undefined;

  try {
    const result = await publishDraft(intentId, { name, by: user.id });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith('NO_DRAFT_TO_PUBLISH')) {
      return NextResponse.json({ error: 'No draft to publish — build or refine first' }, { status: 409 });
    }
    if (msg.startsWith('OKF_VALIDATION_FAILED')) {
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 });
  }
}