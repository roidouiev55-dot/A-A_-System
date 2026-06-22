"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { BRANDS, BLIST, fmtDate, fmtDateFull, dowHeb, diffDays, buildReminders } from "../lib/core";
import LockGuard from "./LockGuard";
import s from "./app.module.css";

const api = (path, opts) => fetch(`/api/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, ...opts });
const apiGet = (path) => fetch(`/api/${path}`).then(r => r.json());
const apiPost = (path, body) => api(path, { body: JSON.stringify(body) }).then(r => r.json());
const apiPut = (path, body) => api(path, { method: "PUT", body: JSON.stringify(body) }).then(r => r.json());
const apiDel = (path, body) => api(path, { method: "DELETE", body: JSON.stringify(body) }).then(r => r.json());

export default function AppShell() {
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  const reload = useCallback(() => apiGet("data").then(d => { setData(d); setLoading(false); }), []);
  useEffect(() => { reload(); }, [reload]);

  const reminders = useMemo(() => data ? buildReminders(data.events) : [], [data]);
  const today = new Date(); today.setHours(0,0,0,0);

  if (loading) return <div className={s.loading}>טוען את המערכת…</div>;

  const TABS = [
    { id: "dashboard", label: "🏠 דשבורד" },
    { id: "events", label: "🎉 אירועים" },
    { id: "messages", label: "💬 הודעות" },
    { id: "communities", label: "👥 קהילות" },
    { id: "reminders", label: "📨 תזכורות" },
    { id: "brands", label: "🎨 הפקות" },
  ];

  return (
    <div className={s.root}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <div><h1 className={s.h1}>A&A HAFAKOT</h1><p className={s.sub}>מערכת ניהול · אירועים · תזכורות · תוכן</p></div>
        </div>
        <nav className={s.tabs}>{TABS.map(t => (
          <button key={t.id} className={`${s.tab} ${tab===t.id?s.tabOn:""}`} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}</nav>
      </header>
      <main className={s.main}>
        {tab==="dashboard" && <Dashboard data={data} reminders={reminders} today={today} setTab={setTab}/>}
        {tab==="events" && <Events data={data} reload={reload} unlocked={unlocked} setUnlocked={setUnlocked}/>}
        {tab==="messages" && <Messages data={data} reload={reload}/>}
        {tab==="communities" && <Communities data={data} reload={reload} unlocked={unlocked} setUnlocked={setUnlocked}/>}
        {tab==="reminders" && <Reminders data={data} reminders={reminders} today={today} reload={reload}/>}
        {tab==="brands" && <BrandsTab data={data} reload={reload} unlocked={unlocked} setUnlocked={setUnlocked}/>}
      </main>
      <footer className={s.footer}>A&A HAFAKOT · מערכת ניהול 2026</footer>
    </div>
  );
}

// ── Dashboard ──
function Dashboard({ data, reminders, today, setTab }) {
  const upcoming = [...data.events].filter(e => new Date(e.date) >= today).sort((a,b) => new Date(a.date)-new Date(b.date));
  const next = upcoming[0];
  const weekRem = reminders.filter(r => { const d = diffDays(today, new Date(r.sendDate)); return d >= 0 && d <= 7; });
  const unsent = data.messages.filter(m => m.status === "לא נשלח");

  return (
    <div>
      <div className={s.statRow}>
        <div className={s.stat}><span className={s.statN}>{data.events.length}</span><span className={s.statL}>אירועים</span></div>
        <div className={s.stat}><span className={s.statN}>{upcoming.length}</span><span className={s.statL}>עתידיים</span></div>
        <div className={s.stat}><span className={s.statN}>{weekRem.length}</span><span className={s.statL}>תזכורות השבוע</span></div>
        <div className={s.stat}><span className={s.statN}>{unsent.length}</span><span className={s.statL}>הודעות לשלוח</span></div>
      </div>

      {next && (
        <div className={s.card} style={{ borderRight: `4px solid ${BRANDS[next.brand]?.text}` }}>
          <div className={s.cardLabel}>האירוע הקרוב</div>
          <div className={s.cardRow}>
            <span className={s.badge} style={{ background: BRANDS[next.brand]?.bg, color: BRANDS[next.brand]?.text }}>{BRANDS[next.brand]?.name}</span>
            <span className={s.cardName}>{next.name}</span>
            <span className={s.countdown}>{(() => { const d = diffDays(today,new Date(next.date)); return d===0?"היום!":d===1?"מחר":`עוד ${d} ימים`; })()}</span>
          </div>
          <div className={s.cardMeta}>{fmtDateFull(next.date)} · {dowHeb(next.date)}{next.location?` · ${next.location}`:""}{next.link && <> · <a href={next.link} target="_blank" rel="noreferrer" className={s.link}>קישור ↗</a></>}</div>
        </div>
      )}

      <h3 className={s.secTitle}>📋 מה לעשות היום</h3>
      {(() => {
        const todayRem = reminders.filter(r => diffDays(today, new Date(r.sendDate)) === 0 && !data.remindersSent[r.id]);
        const todayMsgs = unsent.filter(m => { const ev = data.events.find(e=>e.id===m.event_id); if(!ev) return false; const d=diffDays(today,new Date(ev.date)); return d>=0&&d<=3; });
        const items = [...todayRem.map(r=>({type:"rem",r})), ...todayMsgs.map(m=>({type:"msg",m}))];
        if(!items.length) return <div className={s.empty}>אין משימות דחופות להיום — יום נקי ✓</div>;
        return (
          <div className={s.list}>
            {items.map((it,i) => it.type==="rem" ? (
              <div key={i} className={s.row} style={{borderRight:`3px solid ${BRANDS[it.r.brand]?.text}`}}>
                <span className={`${s.chTag} ${it.r.channel==="email"?s.chEmail:s.chSms}`}>{it.r.channel==="email"?"✉ מייל":"✆ SMS"}</span>
                <span className={s.badge} style={{background:BRANDS[it.r.brand]?.bg,color:BRANDS[it.r.brand]?.text}}>{BRANDS[it.r.brand]?.name}</span>
                <span className={s.rowText}>{it.r.label} · ל{it.r.eventName}</span>
              </div>
            ) : (
              <div key={i} className={s.row} style={{borderRight:`3px solid ${BRANDS[it.m.brand]?.text}`}}>
                <span className={s.chTag} style={{background:"#fce7f3",color:"#be185d"}}>💬 הודעה</span>
                <span className={s.badge} style={{background:BRANDS[it.m.brand]?.bg,color:BRANDS[it.m.brand]?.text}}>{BRANDS[it.m.brand]?.name}</span>
                <span className={s.rowText}>{it.m.msg_type} — {it.m.body.slice(0,60)}…</span>
                <button className={s.btnSm} onClick={()=>setTab("messages")}>פתח</button>
              </div>
            ))}
          </div>
        );
      })()}

      <h3 className={s.secTitle}>תזכורות לשבוע הקרוב</h3>
      {weekRem.length===0 && <div className={s.empty}>אין תזכורות השבוע</div>}
      <div className={s.list}>{weekRem.slice(0,8).map(r => (
        <div key={r.id} className={s.row} style={{borderRight:`3px solid ${BRANDS[r.brand]?.text}`}}>
          <span className={s.rowDate}>{fmtDate(r.sendDate)} · {dowHeb(r.sendDate)}</span>
          <span className={`${s.chTag} ${r.channel==="email"?s.chEmail:s.chSms}`}>{r.channel==="email"?"✉":"✆"}</span>
          <span className={s.badge} style={{background:BRANDS[r.brand]?.bg,color:BRANDS[r.brand]?.text}}>{BRANDS[r.brand]?.name}</span>
          <span className={s.rowText}>{r.label}</span>
        </div>
      ))}</div>
    </div>
  );
}

// ── Events ──
function Events({ data, reload, unlocked, setUnlocked }) {
  const empty = { brand:"WN", name:"", date:"", location:"", link:"" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const sorted = [...data.events].sort((a,b) => new Date(a.date)-new Date(b.date));

  async function save() {
    if(!form.name||!form.date) return alert("שם ותאריך חובה");
    if(editId) { await apiPut("events", { id:editId, ...form }); setEditId(null); }
    else { await apiPost("events", form); }
    setForm(empty); reload();
  }
  async function remove(id) { if(confirm("למחוק?")) { await apiDel("events",{id}); reload(); } }
  function startEdit(e) { setEditId(e.id); setForm({ brand:e.brand, name:e.name, date:e.date?.slice(0,10), location:e.location||"", link:e.link||"" }); }

  return (
    <div>
      <div className={s.card}>
        <div className={s.cardLabel}>{editId?"עריכת אירוע":"הוספת אירוע חדש"}</div>
        <div className={s.formGrid}>
          <label className={s.field}><span>הפקה</span><select value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}>{BLIST.map(b=><option key={b} value={b}>{BRANDS[b].name}</option>)}</select></label>
          <label className={s.field}><span>שם</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="שם האירוע"/></label>
          <label className={s.field}><span>תאריך</span><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
          <label className={s.field}><span>מיקום</span><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
          <label className={s.fieldW}><span>קישור כרטיסים</span><input dir="ltr" value={form.link} onChange={e=>setForm({...form,link:e.target.value})} placeholder="https://..."/></label>
        </div>
        <div className={s.actions}>
          <button className={s.btnP} onClick={save}>{editId?"שמור שינויים":"+ הוסף אירוע"}</button>
          {editId && <button className={s.btnG} onClick={()=>{setEditId(null);setForm(empty);}}>ביטול</button>}
        </div>
      </div>
      <LockGuard onChange={setUnlocked}/>
      <div className={s.list}>{sorted.map(e => (
        <div key={e.id} className={s.row} style={{borderRight:`3px solid ${BRANDS[e.brand]?.text}`}}>
          <span className={s.rowDate}>{fmtDate(e.date)} · {dowHeb(e.date)}</span>
          <span className={s.badge} style={{background:BRANDS[e.brand]?.bg,color:BRANDS[e.brand]?.text}}>{BRANDS[e.brand]?.name}</span>
          <span className={s.rowText}>{e.name}{e.location?` · ${e.location}`:""}</span>
          {e.link && <a href={e.link} target="_blank" rel="noreferrer" className={s.link}>↗</a>}
          <div className={s.rowActs}>
            <button className={s.btnSm} disabled={!unlocked} onClick={()=>startEdit(e)}>✎</button>
            <button className={s.btnSmD} disabled={!unlocked} onClick={()=>remove(e.id)}>🗑</button>
          </div>
        </div>
      ))}</div>
    </div>
  );
}

// ── Messages ──
function Messages({ data, reload }) {
  const sorted = [...data.events].sort((a,b) => new Date(a.date)-new Date(b.date));
  const [selId, setSelId] = useState(sorted[0]?.id || "");
  const [generating, setGenerating] = useState(false);
  const event = data.events.find(e => e.id === selId);
  const msgs = data.messages.filter(m => m.event_id === selId);

  async function generate() {
    if(!event) return;
    setGenerating(true);
    await apiPost("messages", { action: "generate", event });
    await reload();
    setGenerating(false);
  }
  async function markSent(id) {
    await apiPost("messages", { action: "updateStatus", id, status: "נשלח" });
    reload();
  }
  async function copyMsg(text) {
    await navigator.clipboard?.writeText(text);
  }

  return (
    <div>
      <p className={s.note}>בחר אירוע → לחץ "צור הודעות" → המערכת כותבת שתי הודעות AI (ערך + CTA) מוכנות לשליחה בווטסאפ.</p>
      <div className={s.card}>
        <div className={s.formRow}>
          <label className={s.field}><span>בחר אירוע</span>
            <select value={selId} onChange={e=>setSelId(e.target.value)}>
              {sorted.map(e=><option key={e.id} value={e.id}>{BRANDS[e.brand]?.name} · {e.name} · {fmtDate(e.date)}</option>)}
            </select>
          </label>
          <button className={s.btnP} onClick={generate} disabled={generating}>
            {generating ? "יוצר..." : "🤖 צור הודעות AI"}
          </button>
        </div>
      </div>

      {msgs.length > 0 && <h3 className={s.secTitle}>הודעות שנוצרו לאירוע הזה</h3>}
      <div className={s.list}>{msgs.map(m => (
        <div key={m.id} className={`${s.msgCard} ${m.status==="נשלח"?s.msgSent:""}`} style={{borderRight:`3px solid ${BRANDS[m.brand]?.text}`}}>
          <div className={s.msgHead}>
            <span className={s.badge} style={{background:BRANDS[m.brand]?.bg,color:BRANDS[m.brand]?.text}}>{BRANDS[m.brand]?.name}</span>
            <span className={s.msgType}>{m.msg_type}</span>
            <span className={`${s.msgStatus} ${m.status==="נשלח"?s.statusSent:s.statusPending}`}>{m.status}</span>
          </div>
          <pre className={s.msgBody}>{m.body}</pre>
          <div className={s.msgActions}>
            <button className={s.btnP} onClick={()=>copyMsg(m.body)}>📋 העתק</button>
            {m.status!=="נשלח" && <button className={s.btnG} onClick={()=>markSent(m.id)}>✓ סמן כנשלח</button>}
          </div>
        </div>
      ))}</div>
    </div>
  );
}

// ── Communities ──
function Communities({ data, reload, unlocked, setUnlocked }) {
  const [form, setForm] = useState({ brand:"WN", name:"", link:"" });
  const comms = data.communities || [];

  async function add() {
    if(!form.name) return alert("שם הקהילה חובה");
    await apiPost("communities", form);
    setForm({brand:"WN",name:"",link:""});
    reload();
  }
  async function remove(id) { if(confirm("למחוק?")) { await apiDel("communities",{id}); reload(); } }

  const grouped = {};
  BLIST.forEach(b => { grouped[b] = comms.filter(c => c.brand === b); });

  return (
    <div>
      <div className={s.card}>
        <div className={s.cardLabel}>הוספת קהילה חדשה</div>
        <div className={s.formGrid}>
          <label className={s.field}><span>הפקה</span><select value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}>{BLIST.map(b=><option key={b} value={b}>{BRANDS[b].name}</option>)}</select></label>
          <label className={s.field}><span>שם הקהילה</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="למשל: WINE NOT קהילה ראשית"/></label>
          <label className={s.fieldW}><span>קישור לקהילה</span><input dir="ltr" value={form.link} onChange={e=>setForm({...form,link:e.target.value})} placeholder="https://chat.whatsapp.com/..."/></label>
        </div>
        <div className={s.actions}><button className={s.btnP} onClick={add}>+ הוסף קהילה</button></div>
      </div>
      <LockGuard onChange={setUnlocked}/>
      {BLIST.map(b => grouped[b].length > 0 && (
        <div key={b}>
          <h3 className={s.secTitle} style={{color:BRANDS[b].text}}>{BRANDS[b].name} · {grouped[b].length} קהילות</h3>
          <div className={s.list}>{grouped[b].map(c => (
            <div key={c.id} className={s.row} style={{borderRight:`3px solid ${BRANDS[b].text}`}}>
              <span className={s.badge} style={{background:BRANDS[b].bg,color:BRANDS[b].text}}>{BRANDS[b].name}</span>
              <span className={s.rowText}>{c.name}</span>
              {c.link && <a href={c.link} target="_blank" rel="noreferrer" className={s.link}>פתח ↗</a>}
              <button className={s.btnSmD} disabled={!unlocked} onClick={()=>remove(c.id)}>🗑</button>
            </div>
          ))}</div>
        </div>
      ))}
      {comms.length===0 && <div className={s.empty}>עוד לא הוספת קהילות. הוסף את קהילות הווטסאפ שלך למעלה.</div>}
    </div>
  );
}

// ── Reminders ──
function Reminders({ data, reminders, today, reload }) {
  const sent = data.remindersSent || {};
  async function toggle(id) {
    await apiPut("reminders", { id, sent: !sent[id] });
    reload();
  }
  return (
    <div>
      <p className={s.note}>תזכורות מחושבות אוטומטית לפי תאריך כל אירוע. סמן ✓ אחרי ששלחת.</p>
      <div className={s.list}>{reminders.map(r => {
        const isSent = !!sent[r.id];
        const d = diffDays(today, new Date(r.sendDate));
        const overdue = d < 0 && !isSent;
        const soon = d >= 0 && d <= 3 && !isSent;
        return (
          <div key={r.id} className={`${s.row} ${isSent?s.rowDone:""} ${overdue?s.rowOverdue:""}`} style={{borderRight:`3px solid ${BRANDS[r.brand]?.text}`}}>
            <button className={`${s.check} ${isSent?s.checkOn:""}`} onClick={()=>toggle(r.id)}>{isSent?"✓":""}</button>
            <span className={s.rowDate}>{fmtDate(r.sendDate)} · {dowHeb(r.sendDate)}</span>
            <span className={`${s.chTag} ${r.channel==="email"?s.chEmail:s.chSms}`}>{r.channel==="email"?"✉ מייל":"✆ SMS"}</span>
            <span className={s.badge} style={{background:BRANDS[r.brand]?.bg,color:BRANDS[r.brand]?.text}}>{BRANDS[r.brand]?.name}</span>
            <span className={s.rowText}>{r.label} · ל{r.eventName} ({fmtDate(r.eventDate)})</span>
            {soon && <span className={s.tagSoon}>בקרוב</span>}
            {overdue && <span className={s.tagOver}>עבר</span>}
          </div>
        );
      })}</div>
    </div>
  );
}

// ── Brands ──
function BrandsTab({ data, reload, unlocked, setUnlocked }) {
  const assets = data.brandAssets || {};
  const [draft, setDraft] = useState(assets);
  useEffect(() => setDraft(data.brandAssets || {}), [data.brandAssets]);

  async function save(bid) {
    await apiPut("brands", { brand: bid, ...draft[bid] });
    reload();
  }

  return (
    <div>
      <LockGuard onChange={setUnlocked}/>
      <div className={s.brandsGrid}>{BLIST.map(bid => {
        const b = BRANDS[bid], m = draft[bid] || {};
        return (
          <div key={bid} className={s.brandCard} style={{borderTop:`4px solid ${b.text}`}}>
            <div className={s.brandHead}>
              <span className={s.badge} style={{background:b.bg,color:b.text}}>{b.name}</span>
              <span className={s.brandType}>{b.type}</span>
            </div>
            {m.logo ? <img src={m.logo} alt={b.name} className={s.brandLogo}/> : <div className={s.brandLogoEmpty}>אין לוגו</div>}
            <label className={s.field}><span>לוגו (URL)</span><input dir="ltr" disabled={!unlocked} value={m.logo||""} onChange={e=>setDraft({...draft,[bid]:{...m,logo:e.target.value}})}/></label>
            <label className={s.field}><span>תיקיית דרייב</span><input dir="ltr" disabled={!unlocked} value={m.drive_link||""} onChange={e=>setDraft({...draft,[bid]:{...m,drive_link:e.target.value}})}/></label>
            <label className={s.field}><span>טון הקול</span><input disabled={!unlocked} value={m.tone||""} onChange={e=>setDraft({...draft,[bid]:{...m,tone:e.target.value}})}/></label>
            <label className={s.field}><span>האשטגים</span><input disabled={!unlocked} value={m.hashtags||""} onChange={e=>setDraft({...draft,[bid]:{...m,hashtags:e.target.value}})}/></label>
            <div className={s.brandActs}>
              {m.drive_link && <a href={m.drive_link} target="_blank" rel="noreferrer" className={s.btnG}>📁 דרייב</a>}
              <button className={s.btnP} disabled={!unlocked} onClick={()=>save(bid)}>שמור</button>
            </div>
          </div>
        );
      })}</div>
    </div>
  );
}
