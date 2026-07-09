import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function getSessionOrApiKey(request: NextRequest) {
  // 1. Try cookie-based session (Frontend)
  const session = await getServerSession(authOptions);
  if (session?.user) {
    return session.user as { id: string; email: string; name: string; role: 'ADMIN' | 'REVIEWER' | 'END_USER' };
  }

  // 2. Try Authorization Bearer token (API client)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const apiKey = authHeader.substring(7).trim();
    if (apiKey) {
      const user = await prisma.user.findUnique({
        where: { apiKey },
        select: { id: true, email: true, name: true, role: true }
      });
      if (user) {
        return user;
      }
    }
  }

  // 3. Try x-api-key header (Alternative API client)
  const xApiKey = request.headers.get('x-api-key')?.trim();
  if (xApiKey) {
    const user = await prisma.user.findUnique({
      where: { apiKey: xApiKey },
      select: { id: true, email: true, name: true, role: true }
    });
    if (user) {
      return user;
    }
  }

  return null;
}
