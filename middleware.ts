import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const isAdminRoute = url.pathname.startsWith("/admin");
  if (!isAdminRoute) return NextResponse.next();
  const session = req.cookies.get("admin_session")?.value;
  if (session === "1") return NextResponse.next();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
