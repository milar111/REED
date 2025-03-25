import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Remove /REED prefix from pathname for checking
  const cleanPathname = pathname.replace(/^\/REED/, '');
  
  // Only run this for login and dashboard pages
  if (cleanPathname !== '/login' && cleanPathname !== '/dashboard') {
    return NextResponse.next();
  }
  
  try {
    // Check authentication
    const response = await fetch('https://reed-gilt.vercel.app/check_auth', {
      headers: {
        Cookie: request.headers.get('Cookie') || '',
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    const isAuthenticated = data.authenticated;
    
    // Redirect to dashboard
    if (cleanPathname === '/login' && isAuthenticated) {
      return NextResponse.redirect(new URL('/REED/dashboard', request.url));
    }
    
    // Redirect to login
    if (cleanPathname === '/dashboard' && !isAuthenticated) {
      return NextResponse.redirect(new URL('/REED/login', request.url));
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    // On error, redirect to login
    return NextResponse.redirect(new URL('/REED/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/REED/login', '/REED/dashboard'],
};