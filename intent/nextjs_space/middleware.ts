import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token;
    const pathname = req.nextUrl?.pathname ?? '';

    // Admin routes
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Review routes
    if (pathname.startsWith('/reviews') && token?.role === 'END_USER') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }: any) => !!token,
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/intent/:path*', '/reviews/:path*', '/registry/:path*', '/admin/:path*', '/refine/:path*', '/settings/:path*', '/i/:path*'],
};
