import { NextResponse } from "next/server";

const STATIC_FILE_PATTERN =
  /\.(?:avif|bmp|css|gif|ico|jpe?g|js|json|map|png|svg|txt|webp|woff2?|xml)$/i;

const setFreshDocumentHeaders = (response) => {
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate",
  );
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Surrogate-Control", "no-store");
  return response;
};

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    STATIC_FILE_PATTERN.test(pathname)
  ) {
    return NextResponse.next();
  }

  return setFreshDocumentHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*"],
};
