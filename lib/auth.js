// Shared-password session auth.
// One app password (APP_PASSWORD) gates the whole tool. On login we set an
// httpOnly cookie whose value is a SHA-256 of the password + a server secret,
// so the plaintext password is never stored client-side. The same hash is
// recomputed to verify the cookie — in middleware (edge) and routes (node).
// Uses Web Crypto (globalThis.crypto.subtle), available in both runtimes.

export const COOKIE_NAME = "aa_session";

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// The expected cookie value for the currently-configured password.
// If APP_PASSWORD is unset we return a sentinel that no real cookie can match,
// so the app fails closed (every request is unauthorized) until it's configured.
export async function sessionToken() {
  const pw = process.env.APP_PASSWORD || "";
  if (!pw) return "__unconfigured__";
  const secret = process.env.AUTH_SECRET || "aa-hafakot-default-secret";
  return sha256Hex(`${pw}::${secret}`);
}

// Constant-time-ish string compare to avoid trivial timing leaks on the password.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPassword(input) {
  const pw = process.env.APP_PASSWORD || "";
  if (!pw) return false; // not configured → no login possible
  return safeEqual(input, pw);
}

export async function isAuthed(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return token === (await sessionToken());
}
