import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrApiKey } from '@/lib/api-auth';
import { getVersion } from '@/lib/agent';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionOrApiKey(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const version = await getVersion(params.id);
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  return NextResponse.json(version);
}