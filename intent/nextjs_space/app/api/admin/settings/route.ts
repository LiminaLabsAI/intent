import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.systemSetting.findUnique({
      where: { id: 'default' },
    });

    return NextResponse.json({
      settings: settings ?? {
        id: 'default',
        provider: 'abacusai',
        apiKey: '',
        endpoint: '',
        modelId: '',
      },
    });
  } catch (error: any) {
    console.error('GET /api/admin/settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey, endpoint, modelId } = body ?? {};

    const updated = await prisma.systemSetting.upsert({
      where: { id: 'default' },
      update: {
        provider: provider ?? 'abacusai',
        apiKey: apiKey ?? null,
        endpoint: endpoint ?? null,
        modelId: modelId ?? null,
      },
      create: {
        id: 'default',
        provider: provider ?? 'abacusai',
        apiKey: apiKey ?? null,
        endpoint: endpoint ?? null,
        modelId: modelId ?? null,
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error('POST /api/admin/settings error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
