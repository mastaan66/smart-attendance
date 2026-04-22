import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Resource Gating Logic: Protect files under /resources/
  if (path.startsWith('/resources/')) {
    // In production, extract the student's JWT token
    const token = request.cookies.get('next-auth.session-token');

    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Mock Database verification logic:
    // This checks if the student met the 75% duration rule for the specific session tied to this resource.
    const hasMetAttendanceThreshold = true; // Simulated database check

    if (!hasMetAttendanceThreshold) {
      // Redirect to a "Locked" page or Student Wallet
      const url = new URL('/student?error=resource_locked', request.url);
      return NextResponse.redirect(url);
    }
    
    // Allow access to the PDF/File
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/resources/:path*'],
};
