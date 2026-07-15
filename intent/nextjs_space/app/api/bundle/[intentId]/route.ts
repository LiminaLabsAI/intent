import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrApiKey } from '@/lib/api-auth';
import { getBundle, getOrCreateBundle } from '@/lib/agent';
import { getStore } from '@/lib/agent';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { intentId: string } }) {
  const user = await getSessionOrApiKey(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const intentId = params.intentId;

  // RBAC: END_USER may only see their own intents' bundles
  if (user.role === 'END_USER') {
    const intent = await prisma.intent.findUnique({ where: { id: intentId }, select: { requesterId: true } });
    if (!intent || intent.requesterId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Lazy migration: ensure a bundle exists (seed DRAFT from record.files if built)
  const store = await getStore();
  const record = await store.load(intentId);
  if (record) await getOrCreateBundle(intentId, record, user.id);

  const bundle = await getBundle(intentId);
  if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
  return NextResponse.json(bundle);
}