"use client";
import { useState } from "react";
import { BRANDS, BLIST, fmtDateHeb, dowHeb, dateInputToISO, toDateInput, HEB_MONTHS } from "../../lib/core";
import { apiPost, apiPut, apiDel } from "../api-client";
import LockGuard from "../LockGuard";
import s from "../app.module.css";

// Hebrew day/month/year picker — no American format confusion
function HebDatePicker({ value, onChange }) {
  const parts = (value || "").split("-"); // yyyy-mm-dd
  const y = parts[0] || "", m = parts[1] || "", d = parts[2] || "";
  const now = new Date().getFullYear();
  const years = [now, now+1, now+2];
  function set(nd, nm, ny) {
    if (nd && nm && ny) onChange(`${ny}-${String(nm).padStart(2,"0")}-${String(nd).padStart(2,"0")}`);
    else onChange("");
  }
  return (
    <div className={s.dateRow}>
      <select value={d?String(Number(d)):""} onChange={e=>set(e.target.value, m?String(Number(m)):"", y)}>
        <option value="">יום</option>
        {Array.from({length:31},(_, i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}
      </select>
      <select value={m?String(Number(m)):""} onChange={e=>set(d?String(Number(d)):"", e.target.value, y)}>
        <option value="">חודש</option>
        {HEB_MONTHS.map((mn,i)=><option key={i} value={i+1}>{mn}</option>)}
      </select>
      <select value={y} onChange={e=>set(d?String(Number(d)):"", m?String(Number(m)):"", e.target.value)}>
        <option value="">שנה</option>
        {years.map(yr=><option key={yr} value={yr}>{yr}</option>)}
      </select>
    </div>
  );
}

// ════ EVENTS ════
export default function Events({ data, patch, mutate, notify, today, unlocked, setUnlocked }) {
  const empty = { brand:"WN", name:"", date:"", location:"", link:"", full_details:"" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);
  const sorted = [...data.events].sort((a,b)=>new Date(a.date)-new Date(b.date));

  async function save() {
    if(!form.name||!form.date) return alert("שם ותאריך הם שדות חובה");
    setBusy(true);
    const payload = { brand:form.brand, name:form.name.trim(), date:dateInputToISO(form.date), location:form.location.trim(), link:form.link.trim(), full_details:(form.full_details||"").trim() };
    try {
      if (editId) {
        const updated = await apiPut("events", { id:editId, ...payload });
        patch(d => { d.events = d.events.map(e => e.id===editId ? updated : e); return d; });
        setEditId(null);
      } else {
        const created = await apiPost("events", payload);
        patch(d => { d.events = [...d.events, created]; return d; });
      }
      setForm(empty); // only clear the form once the save actually succeeded
    } catch (e) {
      notify(e?.message || "שמירת האירוע נכשלה");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id) {
    if(!confirm("למחוק את האירוע?")) return;
    await mutate(
      d => { d.events = d.events.filter(e => e.id!==id); return d; },
      () => apiDel("events", { id }),
    );
  }
  function startEdit(e) { setEditId(e.id); setForm({ brand:e.brand, name:e.name, date:toDateInput(e.date), location:e.location||"", link:e.link||"", full_details:e.full_details||"" }); }

  return (
    <div>
      <div className={s.card}>
        <div className={s.cardLabel}>{editId?"✎ עריכת אירוע":"➕ הוספת אירוע חדש"}</div>
        <div className={s.formGrid}>
          <label className={s.field}><span>הפקה</span><select value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}>{BLIST.map(b=><option key={b} value={b}>{BRANDS[b].name}</option>)}</select></label>
          <label className={s.field}><span>שם האירוע</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="למשל: פסטיבל יין קיץ"/></label>
          <label className={s.field}><span>תאריך</span><HebDatePicker value={form.date} onChange={v=>setForm({...form,date:v})}/></label>
          <label className={s.field}><span>מיקום</span><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="עיר / מקום"/></label>
          <label className={s.fieldW}><span>קישור לכרטיסים</span><input dir="ltr" value={form.link} onChange={e=>setForm({...form,link:e.target.value})} placeholder="https://..."/></label>
          <label className={s.fieldW}><span>📋 פרטים מלאים (lineup, מחירים, שעות, הטבות — מזין את ה-AI לכתיבת הודעות)</span>
            <textarea className={s.textarea} value={form.full_details} onChange={e=>setForm({...form,full_details:e.target.value})} placeholder="הדבק כאן את כל הפרטים מעמוד הכרטיסים: lineup, מחירים, שעת פתיחה, מה כלול, הטבות..." rows={5}/>
          </label>
        </div>
        <div className={s.actions}>
          <button className={s.btnP} onClick={save} disabled={busy}>{busy?"שומר…":editId?"שמור שינויים":"+ הוסף אירוע"}</button>
          {editId && <button className={s.btnG} onClick={()=>{setEditId(null);setForm(empty);}}>ביטול</button>}
        </div>
      </div>
      <LockGuard onChange={setUnlocked}/>
      <div className={s.list}>{sorted.map(e => {
        const past = new Date(e.date) < today;
        return (
          <div key={e.id} className={`${s.row} ${past?s.rowDone:""}`} style={{borderRight:`3px solid ${BRANDS[e.brand].text}`}}>
            <span className={s.rowDate}>{fmtDateHeb(e.date)}</span>
            <span className={s.rowDow}>יום {dowHeb(e.date)}</span>
            <span className={s.badge} style={{background:BRANDS[e.brand].bg,color:BRANDS[e.brand].text}}>{BRANDS[e.brand].name}</span>
            <span className={s.rowText}>{e.name}{e.location?` · ${e.location}`:""}</span>
            {e.link && <a href={e.link} target="_blank" rel="noreferrer" className={s.link}>↗</a>}
            <div className={s.rowActs}>
              <button className={s.btnSm} disabled={!unlocked} onClick={()=>startEdit(e)}>✎</button>
              <button className={s.btnSmD} disabled={!unlocked} onClick={()=>remove(e.id)}>🗑</button>
            </div>
          </div>
        );
      })}</div>
    </div>
  );
}
