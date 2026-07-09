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
    const userSession = session.user as any;
    const user = await prisma.user.findUnique({
      where: { id: userSession.id },
      select: { id: true, name: true, email: true, role: true, apiKey: true },
    });
    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('GET /api/auth/me error:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}
