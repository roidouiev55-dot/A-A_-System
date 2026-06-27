"use client";
import { useState } from "react";
import { BRANDS, BLIST } from "../../lib/core";
import { apiPost } from "../api-client";
import s from "../app.module.css";

// ════ LIBRARY — asset repository of all generated messages ════
export default function Library({ data, mutate }) {
  const [brandFilter, setBrandFilter] = useState("all");
  const [usedFilter, setUsedFilter] = useState("all"); // all / used / unused
  const msgs = [...(data.messages||[])];

  const filtered = msgs.filter(m => {
    if (brandFilter !== "all" && m.brand !== brandFilter) return false;
    if (usedFilter === "used" && m.status !== "נשלח") return false;
    if (usedFilter === "unused" && m.status === "נשלח") return false;
    return true;
  });

  function eventName(eid) { return data.events.find(e => e.id === eid)?.name || "אירוע נמחק"; }
  async function toggleUsed(m) {
    const ns = m.status === "נשלח" ? "לא נשלח" : "נשלח";
    await mutate(
      d => { d.messages = d.messages.map(x => x.id===m.id?{...x,status:ns}:x); return d; },
      () => apiPost("messages", { action:"updateStatus", id:m.id, status:ns }),
    );
  }
  async function del(id) {
    if(!confirm("למחוק מהמאגר?")) return;
    await mutate(
      d => { d.messages = d.messages.filter(x => x.id!==id); return d; },
      () => apiPost("messages", { action:"delete", id }),
    );
  }
  async function copy(t){ await navigator.clipboard?.writeText(t); }

  return (
    <div>
      <p className={s.note}>מאגר כל ההודעות שנוצרו — מתויגות לפי הפקה, אירוע, וסטטוס (שומש / לא). כך לא חוזרים על תוכן ורואים מה כבר נכתב.</p>
      <div className={s.filterBar}>
        {[{id:"all",name:"כל ההפקות"},...BLIST.map(id=>({id,name:BRANDS[id].name}))].map(f=>(
          <button key={f.id} className={`${s.fbtn} ${brandFilter===f.id?s.fbtnOn:""}`}
            style={brandFilter===f.id&&BRANDS[f.id]?{borderColor:BRANDS[f.id].text,color:BRANDS[f.id].text}:{}}
            onClick={()=>setBrandFilter(f.id)}>{f.name}</button>
        ))}
        <span className={s.filterDiv}></span>
        {[{id:"all",name:"הכל"},{id:"unused",name:"לא שומש"},{id:"used",name:"שומש"}].map(f=>(
          <button key={f.id} className={`${s.fbtn} ${usedFilter===f.id?s.fbtnOn:""}`} onClick={()=>setUsedFilter(f.id)}>{f.name}</button>
        ))}
      </div>

      {filtered.length===0 && <div className={s.empty}>אין הודעות במאגר עדיין. צור הודעות בטאב "הודעות".</div>}
      <div className={s.list}>{filtered.map(m => (
        <div key={m.id} className={`${s.msgCard} ${m.status==="נשלח"?s.msgSent:""}`} style={{borderRight:`3px solid ${BRANDS[m.brand].text}`}}>
          <div className={s.msgHead}>
            <span className={s.badge} style={{background:BRANDS[m.brand].bg,color:BRANDS[m.brand].text}}>{BRANDS[m.brand].name}</span>
            <span className={s.msgType}>{m.msg_type}</span>
            <span className={s.libEvent}>· {eventName(m.event_id)}</span>
            <span className={`${s.msgStatus} ${m.status==="נשלח"?s.statusSent:s.statusPending}`}>{m.status==="נשלח"?"שומש":"לא שומש"}</span>
            <button className={s.msgDel} onClick={()=>del(m.id)}>🗑</button>
          </div>
          <pre className={s.msgBody}>{m.body}</pre>
          <div className={s.msgActions}>
            <button className={s.btnP} onClick={()=>copy(m.body)}>📋 העתק</button>
            <button className={s.btnG} onClick={()=>toggleUsed(m)}>{m.status==="נשלח"?"↩ סמן כלא שומש":"✓ סמן כשומש"}</button>
          </div>
        </div>
      ))}</div>
    </div>
  );
}
