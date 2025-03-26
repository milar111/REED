import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  
  // In production, paths include the /REED prefix but we need to normalize them for our logic
  const normalizedPath = pathname.replace(/^\/REED/, '');
  
  // Only protect the dashboard page - let the client-side handle auth for all other pages
  if (normalizedPath !== '/dashboard') {
    return NextResponse.next();
  }
  
  console.log('Dashboard access, checking for auth...');
  
  // If we have a token in the URL, skip the cookie check
  if (search && search.includes('token=')) {
    console.log('Token found in URL, allowing access');
    return NextResponse.next();
  }
  
  // Check for cookies - if no cookies are present, redirect to login
  const cookies = request.headers.get('Cookie');
  if (!cookies || !cookies.includes('sessionid=')) {
    console.log('No session cookie found, redirecting to login');
    const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
    return NextResponse.redirect(new URL(`${basePath}/login`, request.url));
  }
  
  // If cookies exist, let the dashboard page handle the rest
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/REED/dashboard'],
};