import { NextResponse, type NextRequest } from 'next/server';

/** Simple request pass-through middleware */
export async function middleware(request: NextRequest) {
  // If user hits /login, redirect to main dashboard since auth is open
  if (request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
