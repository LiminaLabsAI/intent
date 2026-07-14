import { NextRequest, NextResponse } from 'next/server';
import { getStore, getLLM, runTurn } from '@/lib/agent';

export const dynamic = 'force-dynamic';

function genId(): string {
  return 'INT-' + Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: unknown = body?.message;
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'message (non-empty string) is required' }, { status: 400 });
    }
    const id: string = typeof body?.id === 'string' && body.id ? body.id : genId();
    const risk = body?.risk;
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : undefined;
    const store = await getStore();
    const result = await runTurn(store, id, message, getLLM(), { risk, history });
    return NextResponse.json({ id, moves: result.moves, reply: result.reply, view: result.view });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
