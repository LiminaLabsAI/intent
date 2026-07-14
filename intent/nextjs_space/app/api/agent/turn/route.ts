import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { getStore, getLLM, runTurn, runPersonaSelection, runBuild, materializeRecord } from '@/lib/agent';
import { createIntentHeader, isHeaderBound, syncIntentHeader, saveTranscript } from '@/lib/agent/intent-header.ts';
import type { ChatTurn } from '@/lib/agent/types.ts';

export const dynamic = 'force-dynamic';

function genId(): string {
  return 'INT-' + Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const risk = body?.risk;
    const historyFull: ChatTurn[] = Array.isArray(body?.history) ? body.history : [];
    const history = historyFull.slice(-8); // last 8 turns is enough LLM context
    const personaSelection = typeof body?.personaSelection === 'string' && body.personaSelection ? body.personaSelection : undefined;
    const store = await getStore();

    // ── Persona-selection turn (§5.2 choice UX): the user picked a mode ──────────
    if (personaSelection) {
      const id = typeof body?.id === 'string' && body.id ? body.id : undefined;
      if (!id) return NextResponse.json({ error: 'id is required to select a mode' }, { status: 400 });
      const result = await runPersonaSelection(store, id, personaSelection, getLLM(), { history });
      if (isHeaderBound(id)) {
        const transcript: ChatTurn[] = [
          ...historyFull,
          { role: 'user', content: `Selected the ${personaSelection} mode.` },
          { role: 'agent', content: result.reply },
        ];
        await Promise.all([
          syncIntentHeader(id, result.view).catch(() => {}),
          saveTranscript(id, transcript).catch(() => {}),
        ]);
      }
      return NextResponse.json({ id, moves: result.moves, reply: result.reply, view: result.view });
    }

    // ── Build run (ADR-0002): the user approved building the working memory ──────
    if (body?.build === true) {
      const id = typeof body?.id === 'string' && body.id ? body.id : undefined;
      if (!id) return NextResponse.json({ error: 'id is required to build' }, { status: 400 });
      await runBuild(store, id, getLLM());
      const view = await materializeRecord(store, id);
      if (!view) return NextResponse.json({ error: 'record not found' }, { status: 404 });
      const names = (view.record.files ?? []).map((f) => f.name).join(', ');
      const reply = `Built ${view.record.files?.length ?? 0} file${(view.record.files?.length ?? 0) === 1 ? '' : 's'}${names ? ` — ${names}` : ''}. Actual cost ${view.record.actualCost != null ? `$${view.record.actualCost}` : 'recorded'}.`;
      if (isHeaderBound(id)) {
        const transcript: ChatTurn[] = [
          ...historyFull,
          { role: 'user', content: 'Build the working memory.' },
          { role: 'agent', content: reply },
        ];
        await Promise.all([
          syncIntentHeader(id, view).catch(() => {}),
          saveTranscript(id, transcript).catch(() => {}),
        ]);
      }
      return NextResponse.json({ id, moves: [{ kind: 'close', rationale: 'built' }], reply, view });
    }

    // ── Normal message turn ─────────────────────────────────────────────────────
    const message: unknown = body?.message;
    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'message (non-empty string) is required' }, { status: 400 });
    }

    // Resolve the record id. New intent + a logged-in user → create an Intent
    // header row bound to the requester; otherwise fall back to an anonymous id.
    let id: string | undefined = typeof body?.id === 'string' && body.id ? body.id : undefined;
    if (!id) {
      const session = await getServerSession(authOptions).catch(() => null);
      const requesterId = (session?.user as { id?: string } | undefined)?.id;
      id = requesterId ? await createIntentHeader(requesterId, message) : genId();
    }

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
