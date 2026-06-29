export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { COOKIE_NAME, sessionToken, checkPassword, isAuthed } from "../../../lib/auth";

const cookieOpts = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
});

// Is the current request authenticated? (public — used by the login gate)
export async function GET(req) {
  return NextResponse.json({ authed: await isAuthed(req) });
}

// Log in with the shared password.
export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!(await checkPassword(password))) {
    // slow down automated password guessing (partial — proper rate limiting
    // would need an external store across serverless instances)
    await new Promise(r => setTimeout(r, 600));
    return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, await sessionToken(), cookieOpts());
  return res;
}

// Log out.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { ...cookieOpts(), maxAge: 0 });
  return res;
}
