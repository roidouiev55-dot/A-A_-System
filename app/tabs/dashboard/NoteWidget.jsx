"use client";
import { useState, useRef, useEffect } from "react";
import { apiPut } from "../../api-client";
import s from "../../app.module.css";

// Free-text personal note, autosaved to Supabase ~1.2s after typing stops.
// If the personal_notes table is missing, we show a migration hint and don't
// attempt to save (so the widget never crashes the dashboard).
export default function NoteWidget({ initialNote, ready }) {
  const [value, setValue] = useState(initialNote || "");
  const [status, setStatus] = useState(""); // "", "saving", "saved", "error"
  const timer = useRef(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function onChange(e) {
    const v = e.target.value;
    setValue(v);
    if (!ready) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await apiPut("personal-notes", { content: v });
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 1200);
  }

  return (
    <div className={`${s.widget} ${s.wNote}`}>
      <div className={s.wLabel}>
        📝 פתקית אישית
        {status === "saving" && <span className={s.noteStatus}>שומר…</span>}
        {status === "saved" && <span className={`${s.noteStatus} ${s.noteSaved}`}>נשמר ✓</span>}
        {status === "error" && <span className={`${s.noteStatus} ${s.noteErr}`}>שגיאת שמירה</span>}
      </div>
      {ready ? (
        <textarea
          className={s.noteArea}
          value={value}
          onChange={onChange}
          placeholder="רשום לעצמך תזכורות, רעיונות, כל מה שבראש…"
          dir="rtl"
        />
      ) : (
        <div className={s.wEmpty}>
          כדי להפעיל את הפתקית — הרץ את db/personal_notes.sql ב-Supabase
        </div>
      )}
    </div>
  );
}
