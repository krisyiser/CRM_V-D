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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      },
    });
  }

  // 2. Allow Next.js internal files, auth login API, website integration API, and public static media files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/website') ||
    PUBLIC_FILE_PATTERN.test(pathname)
  ) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    return response;
  }

  const token = request.cookies.get('vd_session_token')?.value;
  const apiKeyHeader = request.headers.get('x-api-key') || request.headers.get('authorization');

  // Allow API routes if valid API key header is provided
  if (pathname.startsWith('/api/') && apiKeyHeader) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }

  // 3. IF NOT AUTHENTICATED: Block non-API routes or return 401 for unauthenticated API
  if (!token && pathname !== '/login') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized. Session cookie or API Key required.' }, { status: 401 });
    }

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

