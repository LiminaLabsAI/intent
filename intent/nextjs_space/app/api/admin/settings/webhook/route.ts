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
      where: { id: 'webhook' },
    });

    return NextResponse.json({
      settings: settings ?? {
        id: 'webhook',
        provider: 'webhook',
        apiKey: '',
        endpoint: '',
      },
    });
  } catch (error: any) {
    console.error('GET /api/admin/settings/webhook error:', error);
    return NextResponse.json({ error: 'Failed to fetch webhook settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { apiKey, endpoint } = body ?? {};

    const updated = await prisma.systemSetting.upsert({
      where: { id: 'webhook' },
      update: {
        provider: 'webhook',
        apiKey: apiKey ?? null,
        endpoint: endpoint ?? null,
      },
      create: {
        id: 'webhook',
        provider: 'webhook',
        apiKey: apiKey ?? null,
        endpoint: endpoint ?? null,
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error('POST /api/admin/settings/webhook error:', error);
    return NextResponse.json({ error: 'Failed to save webhook settings' }, { status: 500 });
  }
}
