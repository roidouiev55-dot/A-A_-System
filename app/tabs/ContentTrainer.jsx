"use client";
import { useState } from "react";
import { BRANDS, BLIST } from "../../lib/core";
import { apiPost } from "../api-client";
import s from "../app.module.css";

// ════ CONTENT TRAINER ════
// Generate a story suggestion via Gemini, approve/reject with an optional note.
// Every decision is saved to content_feedback — the data that trains future
// suggestions (the route feeds the last 10 back into the prompt).
export default function ContentTrainer({ data }) {
  const [brand, setBrand] = useState("WN");
  const [suggestion, setSuggestion] = useState(null); // { text, content_type }
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState(null);     // 'approved' | 'rejected' | null
  const [note, setNote] = useState("");
  const [count, setCount] = useState(data?.feedbackCount || 0);
  const [err, setErr] = useState("");

  function pickBrand(bid) {
    setBrand(bid);
    setSuggestion(null); setDecision(null); setNote(""); setErr("");
  }

  async function generate() {
    setLoading(true); setErr(""); setDecision(null); setNote("");
    try {
      const res = await apiPost("trainer", { action: "generate", brand });
      setSuggestion({ text: res.suggestion, content_type: res.content_type || "" });
    } catch (e) {
      setErr("שגיאה ביצירה: " + (e?.message || ""));
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  }

  // Save the current decision + note, then immediately generate the next one.
  async function saveAndContinue() {
    if (!suggestion || !decision) return;
    const payload = {
      action: "feedback",
      brand,
      content_type: suggestion.content_type,
      suggestion: suggestion.text,
      decision,
      note: note.trim(),
    };
    // optimistic: bump the counter and start loading the next suggestion at once
    setCount(c => c + 1);
    setSuggestion(null); setDecision(null); setNote(""); setErr(""); setLoading(true);
    try {
      const res = await apiPost("trainer", payload);
      if (res && typeof res.count === "number") setCount(res.count); // reconcile with server
    } catch (e) {
      setCount(c => Math.max(0, c - 1)); // roll back the optimistic bump
      setErr("שמירת הפידבק נכשלה: " + (e?.message || ""));
    }
    await generate();
  }

  const b = BRANDS[brand];

  return (
    <div>
      <p className={s.note}>
        בחר הפקה → המערכת מציעה סטורי → אשר או דחה (אפשר להוסיף הערה).
        כל פידבק נשמר ומאמן את המערכת להצעות טובות יותר בפעם הבאה.
      </p>

      <div className={s.filterBar}>
        {BLIST.map(bid => (
          <button key={bid}
            className={`${s.fbtn} ${brand === bid ? s.fbtnOn : ""}`}
            style={brand === bid ? { borderColor: BRANDS[bid].glow, color: BRANDS[bid].glow, borderWidth: 1.5 } : {}}
            onClick={() => pickBrand(bid)}>
            {BRANDS[bid].name}
          </button>
        ))}
      </div>

      <div className={s.card} style={{ borderTop: `4px solid ${b.glow}` }}>
        <div className={s.cardLabel}>🎯 מאמן התוכן · {b.name}</div>

        {!suggestion && !loading && (
          <div className={s.actions}>
            <button className={s.btnP} onClick={generate}>✨ צור הצעה</button>
            <span className={s.genHint}>פידבקים שנאספו: {count}</span>
          </div>
        )}

        {loading && <div className={s.empty}>✍️ המערכת חושבת על הצעה ל־{b.name}…</div>}

        {suggestion && !loading && (
          <>
            {suggestion.content_type && (
              <span className={s.badge} style={{ background: b.bg, color: b.text, marginBottom: 12, display: "inline-block" }}>
                {suggestion.content_type}
              </span>
            )}
            <pre className={s.msgBody}>{suggestion.text}</pre>

            {!decision ? (
              <div className={s.actions}>
                <button className={s.btnP} onClick={() => setDecision("approved")}>✅ אישור</button>
                <button className={s.btnG} onClick={() => setDecision("rejected")}>❌ דחייה</button>
                <span className={s.genHint}>פידבקים שנאספו: {count}</span>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <label className={s.field}>
                  <span>{decision === "approved" ? "✅ אושר" : "❌ נדחה"} · רוצה להוסיף הערה? (לא חובה)</span>
                  <textarea className={s.textarea} value={note} onChange={e => setNote(e.target.value)}
                    placeholder="מה עבד / לא עבד, מה לשנות בפעם הבאה…" rows={3} />
                </label>
                <div className={s.actions}>
                  <button className={s.btnP} onClick={saveAndContinue}>💾 שמור והמשך</button>
                  <button className={s.btnG} onClick={() => { setDecision(null); setNote(""); }}>חזרה</button>
                </div>
              </div>
            )}
          </>
        )}

        {err && <div className={s.errBox}>{err}</div>}
      </div>
    </div>
  );
}
