import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_FILE_PATTERN = /\.(png|jpg|jpeg|gif|svg|ico|css|js|webp|woff|woff2|ttf|json)$/i;
const RECEPTION_BLOCKED_PATHS = ['/guests', '/rooms', '/feedback'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Handle CORS preflight OPTIONS requests for API routes
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      },
    });
  }

  // 2. Allow Next.js internal files, all API routes (/api/*), and public static media files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    PUBLIC_FILE_PATTERN.test(pathname)
  ) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    return response;
  }

  const token = request.cookies.get('vd_session_token')?.value;

  // 3. IF NOT AUTHENTICATED: Redirect non-API routes to /login
  if (!token && pathname !== '/login') {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // 4. IF AUTHENTICATED: Redirect /login back to dashboard /
  if (token && pathname === '/login') {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  // 5. ROLE-BASED ACCESS CONTROL (RBAC)
  if (token) {
    try {
      const jsonStr = Buffer.from(token, 'base64').toString('utf-8');
      const session = JSON.parse(jsonStr);

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
