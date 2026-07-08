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
    const body = await request.json();

    if (!body?.content) {
      return NextResponse.json({ error: 'Comment content required' }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        intentId: params.id,
        userId: user.id,
        content: body.content,
      },
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
    });

    return NextResponse.json(comment);
  } catch (error: any) {
    console.error('Comment error:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
