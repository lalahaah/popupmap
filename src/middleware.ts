import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname === '/admin';
  const isAdminPath = req.nextUrl.pathname.startsWith('/admin') && !isAuthPage;

  if (isAdminPath && !isLoggedIn) {
    return NextResponse.redirect(new URL('/admin', req.nextUrl));
  }

  if (isAuthPage && isLoggedIn) {
    // If logged in and trying to access the login page, redirect to a dashboard/queue page
    return NextResponse.redirect(new URL('/admin/submissions', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*'],
};
