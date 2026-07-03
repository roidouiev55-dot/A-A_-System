"use client";
import { useState } from "react";
import { BRANDS, HEB_DAYS } from "../../../lib/core";
import s from "../../app.module.css";

// A 7-day horizontal strip starting today. Each day shows up to 3 brand-colored
// dots (events/tasks that day). Clicking a day opens a detail panel below.
export default function WeekWidget({ days, setTab }) {
  const [sel, setSel] = useState(null);
  const selDay = sel != null ? days[sel] : null;

  return (
    <div className={`${s.widget} ${s.wWeek}`}>
      <div className={s.wLabel}>📅 השבוע הקרוב</div>
      <div className={s.weekStrip}>
        {days.map((d, i) => {
          const dt = new Date(d.date);
          return (
            <button
              key={i}
              className={`${s.weekDay} ${i === 0 ? s.weekToday : ""} ${sel === i ? s.weekSel : ""}`}
              onClick={() => setSel(sel === i ? null : i)}
            >
              <span className={s.weekDow}>{HEB_DAYS[dt.getDay()]}</span>
              <span className={s.weekNum}>{dt.getDate()}</span>
              <span className={s.weekDots}>
                {d.dots.slice(0, 3).map((bid, j) => (
                  <span key={j} className={s.weekDot} style={{ background: BRANDS[bid].glow }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {selDay && (
        <div className={s.weekDetail}>
          {selDay.events.length === 0 && selDay.tasks.length === 0 ? (
            <div className={s.weekDetailEmpty}>אין אירועים או משימות ביום זה</div>
          ) : (
            <>
              {selDay.events.map((e, i) => (
                <div key={"e" + i} className={s.weekDetailRow}>
                  <span className={s.badge} style={{ background: BRANDS[e.brand].bg, color: BRANDS[e.brand].text }}>{BRANDS[e.brand].name}</span>
                  <span className={s.weekDetailText}>🎉 {e.name}</span>
                </div>
              ))}
              {selDay.tasks.map((t, i) => (
                <div key={"t" + i} className={s.weekDetailRow}>
                  <span className={s.badge} style={{ background: BRANDS[t.brand].bg, color: BRANDS[t.brand].text }}>{BRANDS[t.brand].name}</span>
                  <span className={s.weekDetailText}>{t.icon} {t.count} משימות תוכן</span>
                </div>
              ))}
              <button className={s.weekDetailLink} onClick={() => setTab("social")}>לתוכנית המלאה ←</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
