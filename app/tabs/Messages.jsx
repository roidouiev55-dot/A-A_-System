"use client";
import { useState } from "react";
import { BRANDS, fmtDate } from "../../lib/core";
import { apiPost } from "../api-client";
import { relDay } from "../shared";
import s from "../app.module.css";

// ════ MESSAGES ════
export default function Messages({ data, patch, mutate, today }) {
  const sorted = [...data.events].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const [selId, setSelId] = useState(sorted[0]?.id || "");
  const [msgType, setMsgType] = useState("ערך");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const event = data.events.find(e => e.id === selId);
  const msgs = data.messages.filter(m => m.event_id === selId);
  const brandComm = event ? (data.brandAssets?.[event.brand]?.community_link || "") : "";

  async function generate() {
    if(!event) return;
    setBusy(true); setErr("");
    try {
      const res = await apiPost("messages", { action:"generate", event, msgType });
      if (res?.message) patch(d => { d.messages = [res.message, ...d.messages]; return d; });
    } catch (e) {
      setErr("שגיאה ביצירה: " + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  }
  async function markSent(id) {
    await mutate(
      d => { d.messages = d.messages.map(m => m.id===id?{...m,status:"נשלח"}:m); return d; },
      () => apiPost("messages", { action:"updateStatus", id, status:"נשלח" }),
    );
  }
  async function del(id) {
    await mutate(
      d => { d.messages = d.messages.filter(m => m.id!==id); return d; },
      () => apiPost("messages", { action:"delete", id }),
    );
  }
  async function copyMsg(t) { await navigator.clipboard?.writeText(t); }
  async function sendComm(t) {
    await navigator.clipboard?.writeText(t);
    window.open(brandComm || "https://web.whatsapp.com", "_blank");
  }

  return (
    <div>
      <p className={s.note}>בחר אירוע וסוג הודעה → המערכת כותבת הודעת ווטסאפ מוכנה. <b>ערך/טיזר</b> לזמן רחוק מהאירוע · <b>CTA</b> לזמן קרוב.</p>
      <div className={s.card}>
        <div className={s.formGrid}>
          <label className={s.field}><span>אירוע</span>
            <select value={selId} onChange={e=>setSelId(e.target.value)}>
              {sorted.map(e=><option key={e.id} value={e.id}>{BRANDS[e.brand].name} · {e.name} · {fmtDate(e.date)}</option>)}
            </select>
          </label>
          <label className={s.field}><span>סוג הודעה</span>
            <select value={msgType} onChange={e=>setMsgType(e.target.value)}>
              <option value="ערך">ערך / טיזר (רחוק מהאירוע)</option>
              <option value="CTA">CTA (קרוב לאירוע)</option>
            </select>
          </label>
        </div>
        <div className={s.actions}>
          <button className={s.btnP} onClick={generate} disabled={busy}>{busy?"✍️ כותב…":"🤖 צור הודעה"}</button>
          {event && <span className={s.genHint}>{relDay(today, event.date)} לאירוע</span>}
        </div>
        {err && <div className={s.errBox}>{err}</div>}
      </div>

      {msgs.length>0 && <h3 className={s.secTitle}>הודעות לאירוע זה</h3>}
      <div className={s.list}>{msgs.map(m => (
        <div key={m.id} className={`${s.msgCard} ${m.status==="נשלח"?s.msgSent:""}`} style={{borderRight:`3px solid ${BRANDS[m.brand].text}`}}>
          <div className={s.msgHead}>
            <span className={s.badge} style={{background:BRANDS[m.brand].bg,color:BRANDS[m.brand].text}}>{BRANDS[m.brand].name}</span>
            <span className={s.msgType}>{m.msg_type}</span>
            <span className={`${s.msgStatus} ${m.status==="נשלח"?s.statusSent:s.statusPending}`}>{m.status}</span>
            <button className={s.msgDel} onClick={()=>del(m.id)}>🗑</button>
          </div>
          <pre className={s.msgBody}>{m.body}</pre>
          <div className={s.msgActions}>
            <button className={s.btnP} onClick={()=>copyMsg(m.body)}>📋 העתק</button>
            <button className={s.btnWa} onClick={()=>sendComm(m.body)} title={brandComm?"מעתיק ופותח את הקהילה":"מעתיק את ההודעה ופותח ווטסאפ"}>💬 שלח לווטסאפ</button>
            {m.status!=="נשלח" && <button className={s.btnG} onClick={()=>markSent(m.id)}>✓ סמן כנשלח</button>}
          </div>
        </div>
      ))}</div>
    </div>
  );
}
