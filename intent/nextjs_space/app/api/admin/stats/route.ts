export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [totalIntents, totalUsers, statusCounts, recentIntents, pendingReviews] = await Promise.all([
      prisma.intent.count(),
      prisma.user.count(),
      prisma.intent.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.intent.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { requester: { select: { name: true } } },
      }),
      prisma.reviewTask.count({ where: { decision: null } }),
    ]);

    const statusMap: Record<string, number> = {};
    (statusCounts ?? []).forEach((s: any) => {
      statusMap[s?.status ?? 'UNKNOWN'] = s?._count?._all ?? 0;
    });

    return NextResponse.json({
      totalIntents,
      totalUsers,
      statusMap,
      recentIntents,
      pendingReviews,
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
