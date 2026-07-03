"use client";
import s from "../../app.module.css";

// Urgent problems only. The parent renders this widget only when there ARE
// alerts, so there is no "no alerts" state here.
export default function AlertsWidget({ alerts, setTab }) {
  return (
    <div className={`${s.widget} ${s.wAlerts}`}>
      <div className={s.wLabel}>⚠️ התראות</div>
      <div className={s.alertList}>
        {alerts.map((a, i) => (
          <div key={i} className={`${s.alertRow} ${a.level === "urgent" ? s.alertUrgent : s.alertWarn}`}>
            <span className={s.alertIcon}>{a.level === "urgent" ? "🔴" : "🟡"}</span>
            <span className={s.alertText}>{a.text}</span>
            <button className={s.alertBtn} onClick={() => setTab(a.tab)}>פתח</button>
          </div>
        ))}
      </div>
    </div>
  );
}
