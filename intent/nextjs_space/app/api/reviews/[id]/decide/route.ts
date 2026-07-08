export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as any;
    if (user.role === 'END_USER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { decision, reason, conditions } = body ?? {};

    if (!decision) {
      return NextResponse.json({ error: 'Decision is required' }, { status: 400 });
    }

    const review = await prisma.reviewTask.findUnique({
      where: { id: params.id },
      include: { intent: true },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review task not found' }, { status: 404 });
    }

    // Update review task
    await prisma.reviewTask.update({
      where: { id: params.id },
      data: {
        decision,
        reason,
        conditions,
        completedAt: new Date(),
        assigneeId: user.id,
      },
    });

    // Update intent based on decision
    const intentUpdate: any = {};
    if (decision === 'APPROVE') {
      intentUpdate.status = 'APPROVED';
      intentUpdate.currentStage = 7;
      intentUpdate.approvedAt = new Date();
      const count = await prisma.intent.count({ where: { intentId: { not: null } } });
      intentUpdate.intentId = `INT-${String(count + 1).padStart(5, '0')}`;
    } else if (decision === 'REJECT') {
      intentUpdate.status = 'REJECTED';
    } else if (decision === 'REQUEST_CHANGES') {
      intentUpdate.status = 'NEEDS_CLARIFICATION';
    } else if (decision === 'ESCALATE') {
      intentUpdate.status = 'UNDER_REVIEW';
    }

    if (Object.keys(intentUpdate).length > 0) {
      await prisma.intent.update({
        where: { id: review.intentId },
        data: intentUpdate,
      });
    }

    await prisma.auditLog.create({
      data: {
        intentId: review.intentId,
        userId: user.id,
        action: `REVIEW_${decision}`,
        details: { reason, conditions },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Review decision error:', error);
    return NextResponse.json({ error: 'Failed to record decision' }, { status: 500 });
  }
}
