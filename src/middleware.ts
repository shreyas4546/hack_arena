import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Allow unauthenticated GET for cron (it uses Bearer token internally)
  if (req.nextUrl.pathname === '/api/cron/monitor' && req.method === 'GET') {
    return NextResponse.next();
  }

  // Allow unauthenticated GET for settings (GlobalTimer needs to read the timer status)
  if (req.nextUrl.pathname.startsWith('/api/settings') && req.method === 'GET') {
    return NextResponse.next();
  }

  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  // Fail closed: require both environment variables to be explicitly set
  if (!adminUser || !adminPass) {
    return new NextResponse('Auth Required.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Admin Area"',
      },
    });
  }

  const basicAuth = req.headers.get('authorization');

  if (basicAuth && basicAuth.startsWith('Basic ')) {
    try {
      const authValue = basicAuth.split(' ')[1];
      if (authValue) {
        const decoded = atob(authValue);
        const colonIdx = decoded.indexOf(':');
        if (colonIdx !== -1) {
          const user = decoded.substring(0, colonIdx);
          const pwd = decoded.substring(colonIdx + 1);

          if (user === adminUser && pwd === adminPass) {
            return NextResponse.next();
          }
        }
      }
    } catch {
      // Malformed header or base64 decoding error
    }
  }

  return new NextResponse('Auth Required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Admin Area"',
    },
  });
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};
