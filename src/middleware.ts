import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/patient', '/doctor', '/staff', '/manage', '/admin'];
const PUBLIC_PREFIXES = ['/auth', '/api', '/_next', '/favicon', '/manifest', '/icons'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow root (it handles its own redirect)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // For protected routes, check auth cookie
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get('authToken')?.value;
    if (!token) {
      const signinUrl = new URL('/auth/signin', request.url);
      return NextResponse.redirect(signinUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
