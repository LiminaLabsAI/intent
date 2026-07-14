import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { getStore, getLLM, runTurn } from '@/lib/agent';
import { createIntentHeader, isHeaderBound, syncIntentHeader, saveTranscript } from '@/lib/agent/intent-header.ts';
import type { ChatTurn } from '@/lib/agent/types.ts';

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
    const risk = body?.risk;
    const historyFull: ChatTurn[] = Array.isArray(body?.history) ? body.history : [];
    const history = historyFull.slice(-8); // last 8 turns is enough LLM context

    // Resolve the record id. New intent + a logged-in user → create an Intent
    // header row bound to the requester; otherwise fall back to an anonymous id.
    let id: string | undefined = typeof body?.id === 'string' && body.id ? body.id : undefined;
    if (!id) {
      const session = await getServerSession(authOptions).catch(() => null);
      const requesterId = (session?.user as { id?: string } | undefined)?.id;
      id = requesterId ? await createIntentHeader(requesterId, message) : genId();
    }

    const store = await getStore();
    const result = await runTurn(store, id, message, getLLM(), { risk, history });

    if (isHeaderBound(id)) {
      // Persist the FULL transcript (FEAT-001) so a reload restores the whole conversation.
      const transcript: ChatTurn[] = [
        ...historyFull,
        { role: 'user', content: message },
        { role: 'agent', content: result.reply },
      ];
      await Promise.all([
        syncIntentHeader(id, result.view).catch(() => {}),
        saveTranscript(id, transcript).catch(() => {}),
      ]);
    }
    return NextResponse.json({ id, moves: result.moves, reply: result.reply, view: result.view });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
