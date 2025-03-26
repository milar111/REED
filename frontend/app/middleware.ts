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
      },
      credentials: 'include',
      cache: 'no-store', // Disable caching
    });
    
    if (!response.ok) {
      console.error('Auth check failed:', response.status);
      // If the auth check fails, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    const data = await response.json();
    const isAuthenticated = data.authenticated;
    
    // Redirect to dashboard if already authenticated and trying to access login
    if (pathname === '/login' && isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Redirect to login if not authenticated and trying to access dashboard
    if (pathname === '/dashboard' && !isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    // If there's an error checking auth, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard'],
};