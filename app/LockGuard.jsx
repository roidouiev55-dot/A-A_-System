"use client";
import { useState } from "react";
import s from "./app.module.css";

// Single lock — release to enable edit/delete.
export default function LockGuard({ onChange }) {
  const [locked, setLocked] = useState(true);
  function toggle() { const n = !locked; setLocked(n); onChange?.(!n); }
  return (
    <div className={`${s.lockGuard} ${!locked ? s.lockOpen : ""}`}>
      <span className={s.lockLabel}>{!locked ? "🔓 עריכה פתוחה — אפשר לערוך ולמחוק" : "🔒 שחרר את המנעול כדי לערוך או למחוק"}</span>
      <button className={`${s.lockBtn} ${!locked ? s.lockBtnOn : ""}`} onClick={toggle}>
        {locked ? "🔒 נעול" : "🔓 פתוח"}
      </button>
    </div>
  );
}
