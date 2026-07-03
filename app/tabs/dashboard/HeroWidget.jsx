"use client";
import { BRANDS, fmtDateHeb, dowHeb } from "../../../lib/core";
import s from "../../app.module.css";

// Live countdown to the event's local midnight — days + hours.
function countdown(dateStr) {
  const target = new Date(dateStr);
  const now = new Date();
  const ms = target - now;
  if (isNaN(ms)) return "";
  if (ms <= -86400000) return "האירוע עבר";
  if (ms <= 0) return "היום! 🎉";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days === 0) return `עוד ${hours} שעות`;
  return `עוד ${days} ימים, ${hours} שעות`;
}

export default function HeroWidget({ next, setTab }) {
  if (!next) {
    return (
      <div className={`${s.widget} ${s.wHero}`}>
        <div className={s.wLabel}>🎯 האירוע הקרוב</div>
        <div className={s.wEmpty}>אין אירועים מתוכננים — הוסף אירוע בטאב "אירועים"</div>
      </div>
    );
  }
  const b = BRANDS[next.brand];
  const details = (next.full_details || "").trim();
  const snippet = details ? details.split("\n")[0].slice(0, 140) : "";
  return (
    <div className={`${s.widget} ${s.wHero}`} style={{ ["--accent"]: b.glow }}>
      <div className={s.heroTop}>
        <span className={s.wLabel}>🎯 האירוע הקרוב</span>
        <span className={s.badge} style={{ background: b.bg, color: b.text }}>{b.name}</span>
      </div>
      <div className={s.heroName}>{next.name}</div>
      <div className={s.heroCount}>{countdown(next.date)}</div>
      <div className={s.heroMeta}>
        📅 {fmtDateHeb(next.date)} · יום {dowHeb(next.date)}
        {next.location ? ` · 📍 ${next.location}` : ""}
      </div>
      {snippet && <div className={s.heroSnippet}>{snippet}{details.length > snippet.length ? "…" : ""}</div>}
      <div className={s.heroActions}>
        <button className={s.btnP} onClick={() => setTab("events")}>פרטים מלאים ←</button>
        {next.link && <a className={s.btnG} href={next.link} target="_blank" rel="noreferrer">🎫 דף האירוע</a>}
      </div>
    </div>
  );
}
