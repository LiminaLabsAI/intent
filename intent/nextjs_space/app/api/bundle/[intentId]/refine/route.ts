import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrApiKey } from '@/lib/api-auth';
import { getStore, getLLM, runRefine, createDraft, materializeRecord } from '@/lib/agent';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
  const refineRequest = typeof body?.refineRequest === 'string' ? body.refineRequest : '';
  if (!refineRequest) return NextResponse.json({ error: 'refineRequest is required' }, { status: 400 });

  try {
    const store = await getStore();
    const { record, files, label, diff, actualCost, understanding } = await runRefine(
      store, intentId, getLLM(), { refineRequest, by: user.id },
    );

    // Persist as an immutable BundleVersion DRAFT
    const versionId = await createDraft(intentId, files, {
      label,
      understanding,
      costActual: { amount: actualCost, currency: 'USD' },
      personaLabel: record.persona ?? undefined,
      outcome: record.outcome ?? undefined,
      by: user.id,
    });

    const view = await materializeRecord(store, intentId);
    return NextResponse.json({ versionId, label, diff, view });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('NOT_YET_BUILT')) {
      return NextResponse.json({ error: 'Build first before refining' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Refine failed' }, { status: 500 });
  }
}