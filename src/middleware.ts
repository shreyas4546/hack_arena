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

  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'hackarena2026';

    if (user === adminUser && pwd === adminPass) {
      return NextResponse.next();
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
  matcher: ['/admin', '/admin/:path*'],
};
