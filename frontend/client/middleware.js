import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const legacyProductMatch = pathname.match(/^\/products\/([^/]+)\/?$/);

  if (legacyProductMatch?.[1]) {
    const url = request.nextUrl.clone();
    url.pathname = `/product/${legacyProductMatch[1]}`;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/products/:slug"],
};
