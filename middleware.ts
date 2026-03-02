import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, ACCESS_PAGE_PATH } from "@/server/access/constants";

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAllowedPath =
    pathname === ACCESS_PAGE_PATH ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    PUBLIC_FILE.test(pathname);

  if (isAllowedPath) {
    return NextResponse.next();
  }

  const expected = process.env.SITE_ACCESS_PASSWORD;
  const accessCookie = request.cookies.get(ACCESS_COOKIE_NAME)?.value;

  if (!expected) {
    return NextResponse.redirect(new URL(ACCESS_PAGE_PATH, request.url));
  }

  if (accessCookie !== expected) {
    return NextResponse.redirect(new URL(ACCESS_PAGE_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};