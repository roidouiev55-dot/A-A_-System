"use client";
import { useState, useEffect } from "react";

// Wraps the app behind the shared password. Real enforcement is server-side
// (middleware returns 401); this is the UX layer that collects the password
// and only renders children once the session cookie is valid.
export default function LoginGate({ children }) {
  const [authed, setAuthed] = useState(null); // null = checking
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/auth")
      .then(r => r.json())
      .then(d => setAuthed(!!d.authed))
      .catch(() => setAuthed(false));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) { setAuthed(true); setPw(""); }
      else { const d = await res.json().catch(() => ({})); setErr(d.error || "התחברות נכשלה"); }
    } catch {
      setErr("שגיאת רשת — נסה שוב");
    } finally { setBusy(false); }
  }

  if (authed === null) {
    return <div style={S.screen}><div style={{ color: "#888" }}>טוען…</div></div>;
  }
  if (authed) return children;

  return (
    <div style={S.screen}>
      <form onSubmit={submit} style={S.card}>
        <h1 style={S.title}>A&A HAFAKOT</h1>
        <p style={S.sub}>מערכת ניהול · נא להזין סיסמה</p>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          placeholder="סיסמה"
          autoFocus
          style={S.input}
        />
        {err && <div style={S.err}>{err}</div>}
        <button type="submit" disabled={busy || !pw} style={{ ...S.btn, opacity: busy || !pw ? 0.6 : 1 }}>
          {busy ? "מתחבר…" : "כניסה"}
        </button>
      </form>
    </div>
  );
}

const S = {
  screen: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#14110f", fontFamily: "Heebo, sans-serif" },
  card: { background: "#211d1a", padding: "36px 32px", borderRadius: 16, width: "min(360px, 90vw)", boxShadow: "0 12px 40px rgba(0,0,0,.4)", textAlign: "center" },
  title: { margin: 0, fontSize: 26, fontWeight: 900, color: "#f3ede6", letterSpacing: 1 },
  sub: { margin: "6px 0 22px", fontSize: 14, color: "#9a8f84" },
  input: { width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: 16, borderRadius: 10, border: "1px solid #3a332e", background: "#181513", color: "#f3ede6", textAlign: "center", outline: "none" },
  err: { marginTop: 12, color: "#f0a6b2", fontSize: 14 },
  btn: { marginTop: 16, width: "100%", padding: "12px", fontSize: 16, fontWeight: 700, borderRadius: 10, border: "none", background: "#c9a14a", color: "#14110f", cursor: "pointer" },
};
