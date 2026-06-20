import { NextResponse } from 'next/server';

export function middleware(request) {
  const path = request.nextUrl.pathname;
  const session = request.cookies.get('admin_session');

  // Define the routes that require an admin to be logged in
  const protectedRoutes = ['/dashboard', '/settings', '/stock', '/sales', '/errors', '/rfid', '/register-card'];
  const isProtected = protectedRoutes.some(route => path.startsWith(route));

  // 1. If trying to access a protected page without a session, redirect to Login
  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If trying to access the Login page but ALREADY logged in, redirect to Dashboard
  if (path === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Optional: Configure matcher to optimize exactly which paths this runs on
export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/stock/:path*', '/sales/:path*', '/errors/:path*', '/rfid/:path*', '/register-card/:path*', '/login'],
};