import { NextResponse } from "next/server";
import { isAuthed } from "./lib/auth";

// Guard every /api route except the auth endpoint itself.
// This is the single enforcement point for API access — the client-side
// LockGuard/LoginGate are UX only and provide no real protection.
export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  if (!(await isAuthed(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
