"use client";
import s from "../../app.module.css";

// Today's social output as progress bars: X uploaded / Y required per channel.
// Full bar turns green with a ✅ when the channel is complete. Click → its tab.
const ROWS = [
  { key: "story", icon: "📱", label: "סטוריז", tab: "social" },
  { key: "post", icon: "📄", label: "פוסטים", tab: "social" },
  { key: "comm", icon: "💬", label: "הודעות קהילה", tab: "messages" },
];

export default function SocialWidget({ social, setTab }) {
  const anyNeeded = ROWS.some(r => (social[r.key]?.y || 0) > 0);
  return (
    <div className={`${s.widget} ${s.wSocial}`}>
      <div className={s.wLabel}>📊 סושיאל היום</div>
      {!anyNeeded ? (
        <div className={s.wEmpty}>אין תוכן מתוזמן להיום</div>
      ) : (
        <div className={s.socialList}>
          {ROWS.map(r => {
            const { x = 0, y = 0 } = social[r.key] || {};
            const pct = y > 0 ? Math.min(100, Math.round((x / y) * 100)) : 0;
            const full = y > 0 && x >= y;
            return (
              <button key={r.key} className={s.socialRow} onClick={() => setTab(r.tab)} title="פתח">
                <div className={s.socialTop}>
                  <span className={s.socialLabel}>{r.icon} {r.label}</span>
                  <span className={s.socialCount}>{full ? "✅" : `${x}/${y}`}</span>
                </div>
                <div className={s.socialTrack}>
                  <div className={`${s.socialFill} ${full ? s.socialFull : ""}`} style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
