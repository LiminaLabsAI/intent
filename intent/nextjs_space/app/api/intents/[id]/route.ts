export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as any;
    const intent = await prisma.intent.findUnique({
      where: { id: params.id },
      include: {
        requester: { select: { name: true, email: true, role: true } },
        reviewTasks: {
          include: {
            assignee: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: {
            user: { select: { name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 10,
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!intent) {
      return NextResponse.json({ error: 'Intent not found' }, { status: 404 });
    }

    if (user.role === 'END_USER' && intent.requesterId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(intent);
  } catch (error: any) {
    console.error('GET intent error:', error);
    return NextResponse.json({ error: 'Failed to fetch intent' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as any;
    const body = await request.json();

    const intent = await prisma.intent.findUnique({ where: { id: params.id } });
    if (!intent) {
      return NextResponse.json({ error: 'Intent not found' }, { status: 404 });
    }
    if (user.role === 'END_USER' && intent.requesterId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Save version before update
    await prisma.intentVersion.create({
      data: {
        intentId: intent.id,
        version: intent.version,
        snapshot: JSON.parse(JSON.stringify(intent)),
        changedBy: user.id,
        changeReason: body?.changeReason ?? 'Updated',
      },
    });

    const { changeReason, ...updateData } = body ?? {};
    const updated = await prisma.intent.update({
      where: { id: params.id },
      data: { ...updateData, version: { increment: 1 } },
    });

    await prisma.auditLog.create({
      data: {
        intentId: intent.id,
        userId: user.id,
        action: 'INTENT_UPDATED',
        details: { fields: Object.keys(updateData) },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PATCH intent error:', error);
    return NextResponse.json({ error: 'Failed to update intent' }, { status: 500 });
  }
}
