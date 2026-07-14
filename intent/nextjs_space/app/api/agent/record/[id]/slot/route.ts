import { NextRequest, NextResponse } from 'next/server';
import { getStore, materializeRecord } from '@/lib/agent';
import { isHeaderBound, syncIntentHeader } from '@/lib/agent/intent-header.ts';

export const dynamic = 'force-dynamic';

// Direct slot edit — the user typing in the record is an authoritative editor
// (design §3.2). Appends a slot_valued event + marks it strong (user-asserted).
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const body = await req.json();
    const key = body?.key;
    const value = body?.value;
    if (typeof key !== 'string' || typeof value !== 'string') {
      return NextResponse.json({ error: 'key and value (strings) required' }, { status: 400 });
    }
    const id = ctx.params.id;
    const store = await getStore();
    const at = new Date().toISOString();
    if (value.trim()) {
      await store.append(id, { kind: 'slot_valued', at, by: 'user', key, value });
      await store.append(id, { kind: 'slot_assessed', at, by: 'user', key, state: 'strong', reason: 'set directly by the user' });
    } else {
      await store.append(id, { kind: 'slot_assessed', at, by: 'user', key, state: 'empty', reason: 'cleared by the user' });
    }
    const view = await materializeRecord(store, id);
    if (view && isHeaderBound(id)) await syncIntentHeader(id, view).catch(() => {});
    return NextResponse.json(view);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
