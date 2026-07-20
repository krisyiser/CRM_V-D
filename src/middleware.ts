import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_FILE_PATTERN = /\.(png|jpg|jpeg|gif|svg|ico|css|js|webp|woff|woff2|ttf|json)$/i;
const RECEPTION_BLOCKED_PATHS = ['/guests', '/rooms', '/feedback'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow Next.js internal files, auth login API, and public static media files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    PUBLIC_FILE_PATTERN.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('vd_session_token')?.value;

  // 1. IF NOT AUTHENTICATED: Block all routes and FORCE redirect to /login
  if (!token && pathname !== '/login') {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // 2. IF AUTHENTICATED: Redirect /login back to dashboard /
  if (token && pathname === '/login') {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  // 3. ROLE-BASED ACCESS CONTROL (RBAC)
  if (token) {
    try {
      const jsonStr = Buffer.from(token, 'base64').toString('utf-8');
      const session = JSON.parse(jsonStr);

      // Recepción role is restricted from /guests, /rooms, /feedback
      if (session.role === 'Recepción') {
        const isBlocked = RECEPTION_BLOCKED_PATHS.some(bp => 
          pathname === bp || pathname.startsWith(`${bp}/`)
        );
        if (isBlocked) {
          const homeUrl = request.nextUrl.clone();
          homeUrl.pathname = '/';
          return NextResponse.redirect(homeUrl);
        }
      }
    } catch {
      // Invalid token format
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
