"use client";
import { BRANDS, fmtDate } from "../../../lib/core";
import s from "../../app.module.css";

// Compact list of this month's events: date | name | brand badge.
// Capped at 6 rows; overflow links to the events tab.
const MAX = 6;

export default function MonthEventsWidget({ events, setTab }) {
  const shown = events.slice(0, MAX);
  const extra = events.length - shown.length;
  return (
    <div className={`${s.widget} ${s.wMonth}`}>
      <div className={s.wLabel}>🎉 אירועים החודש</div>
      {events.length === 0 ? (
        <div className={s.wEmpty}>אין אירועים החודש</div>
      ) : (
        <div className={s.monthList}>
          {shown.map(e => (
            <button key={e.id} className={s.monthRow} onClick={() => setTab("events")}>
              <span className={s.monthDate}>{fmtDate(e.date)}</span>
              <span className={s.monthName}>{e.name}</span>
              <span className={s.badge} style={{ background: BRANDS[e.brand].bg, color: BRANDS[e.brand].text }}>{BRANDS[e.brand].name}</span>
            </button>
          ))}
          {extra > 0 && (
            <button className={s.monthMore} onClick={() => setTab("events")}>עוד {extra} אירועים ←</button>
          )}
        </div>
      )}
    </div>
  );
}
