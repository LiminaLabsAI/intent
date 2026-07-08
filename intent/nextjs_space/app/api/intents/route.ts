export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as any;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const where: any = {};
    if (user.role === 'END_USER') {
      where.requesterId = user.id;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { rawInput: { contains: search } },
        { standardizedIntent: { contains: search } },
        { intentId: { contains: search } },
      ];
    }

    const [intents, total] = await Promise.all([
      prisma.intent.findMany({
        where,
        include: { requester: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.intent.count({ where }),
    ]);

    return NextResponse.json({ intents, total, page, limit });
  } catch (error: any) {
    console.error('GET intents error:', error);
    return NextResponse.json({ error: 'Failed to fetch intents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as any;
    const body = await request.json();
    const { rawInput, priority } = body ?? {};

    if (!rawInput) {
      return NextResponse.json({ error: 'Intent input is required' }, { status: 400 });
    }

    const intent = await prisma.intent.create({
      data: {
        rawInput,
        priority: priority ?? 'MEDIUM',
        requesterId: user.id,
        status: 'DRAFT',
        currentStage: 1,
      },
    });

    await prisma.auditLog.create({
      data: {
        intentId: intent.id,
        userId: user.id,
        action: 'INTENT_CREATED',
        stage: 1,
        details: { rawInput: rawInput?.substring(0, 200) },
      },
    });

    return NextResponse.json(intent);
  } catch (error: any) {
    console.error('POST intent error:', error);
    return NextResponse.json({ error: 'Failed to create intent' }, { status: 500 });
  }
}
