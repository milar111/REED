import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // In production, paths include the /REED prefix but we need to normalize them for our logic
  const normalizedPath = pathname.replace(/^\/REED/, '');
  
  // Only run this for login and dashboard pages
  if (normalizedPath !== '/login' && normalizedPath !== '/dashboard') {
    return NextResponse.next();
  }
  
  // Don't check auth for login page - let the backend handle redirection if needed
  if (normalizedPath === '/login') {
    return NextResponse.next();
  }
  
  try {
    console.log('Checking auth status...');
    
    const cookies = request.headers.get('Cookie');
    console.log('Cookies sent in request:', cookies);
    
    const response = await fetch('https://reed-gilt.vercel.app/check_auth', {
      method: 'GET',
      headers: {
        'Cookie': cookies || '',
        'Origin': request.headers.get('origin') || new URL(request.url).origin,
      },
      credentials: 'include',
      cache: 'no-store', // Disable caching
    });
    
    console.log('Auth response status:', response.status);
    
    if (!response.ok) {
      console.error('Auth check failed:', response.status);
      
      // Handle redirects based on environment
      const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
      return NextResponse.redirect(new URL(`${basePath}/login`, request.url));
    }
    
    const data = await response.json();
    console.log('Auth data:', data);
    
    const isAuthenticated = data.authenticated;
    
    // Redirect to login if not authenticated and trying to access dashboard
    if (!isAuthenticated) {
      const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
      return NextResponse.redirect(new URL(`${basePath}/login`, request.url));
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    
    // Handle redirect in case of error
    const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
    return NextResponse.redirect(new URL(`${basePath}/login`, request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/dashboard', '/REED/login', '/REED/dashboard'],
};