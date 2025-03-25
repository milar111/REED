import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only run this for login and dashboard pages
  if (pathname !== '/login' && pathname !== '/dashboard') {
    return NextResponse.next();
  }
  
  try {
    const response = await fetch('https://reed-gilt.vercel.app/check_auth', {
      headers: {
        Cookie: request.headers.get('Cookie') || '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      mode: 'cors',
    });
    
    if (!response.ok) {
      // Only redirect to login if we get a 401 or 403 response
      if (response.status === 401 || response.status === 403) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      // For other errors, just continue
      return NextResponse.next();
    }
    
    const data = await response.json();
    const isAuthenticated = data.authenticated;
    
    // Redirect to dashboard if authenticated and on login page
    if (pathname === '/login' && isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Redirect to login if not authenticated and on dashboard
    if (pathname === '/dashboard' && !isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    // Don't redirect on network errors, just continue
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard'],
};