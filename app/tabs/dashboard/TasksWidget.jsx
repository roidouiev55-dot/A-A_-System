"use client";
import { useState } from "react";
import { BRANDS } from "../../../lib/core";
import s from "../../app.module.css";

// Today's actionable tasks. Checking one animates it out, then marks it done —
// it simply vanishes (no "done" list). Empty state is a happy message.
export default function TasksWidget({ tasks, onDone }) {
  const [leaving, setLeaving] = useState({});

  function check(t) {
    if (leaving[t.id]) return;
    setLeaving(prev => ({ ...prev, [t.id]: true }));
    setTimeout(async () => {
      await onDone(t);
      // if the mutation rolled back (API failed), the task reappears — clear the
      // leaving flag so it's visible again instead of stuck at opacity 0.
      setLeaving(prev => { const n = { ...prev }; delete n[t.id]; return n; });
    }, 240);
  }

  return (
    <div className={`${s.widget} ${s.wTasks}`}>
      <div className={s.wLabel}>📋 משימות היום</div>
      {tasks.length === 0 ? (
        <div className={s.wEmpty}>🎉 סיימת להיום</div>
      ) : (
        <div className={s.taskList}>
          {tasks.map(t => (
            <div
              key={t.id}
              className={`${s.taskRow} ${leaving[t.id] ? s.taskLeaving : ""} ${t.urgent ? s.taskUrgent : ""}`}
              style={{ borderRight: `3px solid ${BRANDS[t.brand]?.text || "var(--gold)"}` }}
            >
              <button className={s.taskCheck} onClick={() => check(t)} title="סמן כבוצע" aria-label="סמן כבוצע" />
              <span className={s.taskIcon}>{t.icon}</span>
              <span className={s.taskText}>{t.text}</span>
              {t.brand && <span className={s.badge} style={{ background: BRANDS[t.brand].bg, color: BRANDS[t.brand].text }}>{BRANDS[t.brand].name}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
