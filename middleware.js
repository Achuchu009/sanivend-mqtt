import { NextResponse } from 'next/server';

export function middleware(request) {
  const path = request.nextUrl.pathname;
  const session = request.cookies.get('admin_session');

  // Define the routes that require an admin to be logged in
  const protectedRoutes = ['/dashboard', '/settings', '/stock', '/sales', '/errors', '/rfid', '/register-card'];
  const isProtected = protectedRoutes.some(route => path.startsWith(route));

  // Check if session is valid against the current server run ID
  const isValidSession = session && session.value === process.env.SERVER_RUN_ID;

  // 1. If trying to access a protected page without a valid session, redirect to Login
  if (isProtected && !isValidSession) {
    // If there is an invalid/old session cookie, we can optionally clear it, but redirecting to login is enough
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If trying to access the Login page but ALREADY logged in with a valid session, redirect to Dashboard
  if (path === '/login' && isValidSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Optional: Configure matcher to optimize exactly which paths this runs on
export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*', '/stock/:path*', '/sales/:path*', '/errors/:path*', '/rfid/:path*', '/register-card/:path*', '/login'],
};