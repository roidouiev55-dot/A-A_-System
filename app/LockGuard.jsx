"use client";
import { useState } from "react";
import s from "./app.module.css";

export default function LockGuard({ onChange }) {
  const [l1, setL1] = useState(true);
  const [l2, setL2] = useState(true);
  function toggle(w) {
    const n1 = w===1?!l1:l1, n2 = w===2?!l2:l2;
    if(w===1) setL1(n1); if(w===2) setL2(n2);
    onChange?.(!n1 && !n2);
  }
  const open = !l1 && !l2;
  return (
    <div className={`${s.lockGuard} ${open?s.lockOpen:""}`}>
      <span className={s.lockLabel}>{open?"🔓 עריכה ומחיקה פתוחות":"🔒 שחרר 2 מנעולים לעריכה/מחיקה"}</span>
      <div className={s.lockBtns}>
        <button className={`${s.lockBtn} ${!l1?s.lockBtnOn:""}`} onClick={()=>toggle(1)}>{l1?"🔒":"🔓"} 1</button>
        <button className={`${s.lockBtn} ${!l2?s.lockBtnOn:""}`} onClick={()=>toggle(2)}>{l2?"🔒":"🔓"} 2</button>
      </div>
    </div>
  );
}
