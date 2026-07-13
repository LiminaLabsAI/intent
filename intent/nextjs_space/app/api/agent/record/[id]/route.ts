import { NextRequest, NextResponse } from 'next/server';
import { agentStore, materializeRecord } from '@/lib/agent';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const view = await materializeRecord(agentStore, ctx.params.id);
  if (!view) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(view);
}
