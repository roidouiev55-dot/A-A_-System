"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { BRANDS, BLIST, fmtDate, fmtDateFull, fmtDateHeb, dowHeb, diffDays, buildReminders, addDays, HEB_MONTHS, toDateInput, dateInputToISO } from "../lib/core";
import { buildAllDays } from "../lib/socialplan";
import LockGuard from "./LockGuard";
import s from "./app.module.css";

// Mutating calls throw on HTTP error or {error} payload, so callers can roll
// back optimistic UI instead of silently diverging from the database.
async function apiSend(method, path, body) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  if (!res.ok || (json && json.error)) {
    throw new Error((json && json.error) || `שגיאת שרת (${res.status})`);
  }
  return json;
}
const apiPost = (path, body) => apiSend("POST", path, body);
const apiPut = (path, body) => apiSend("PUT", path, body);
const apiDel = (path, body) => apiSend("DELETE", path, body);
const apiGet = (path) => fetch(`/api/${path}`).then(r=>r.json());

function relDay(today, date) {
  const d = diffDays(today, new Date(date));
  if (d === 0) return "היום";
  if (d === 1) return "מחר";
  if (d === -1) return "אתמול";
  if (d < 0) return `לפני ${Math.abs(d)} ימים`;
  return `בעוד ${d} ימים`;
}

export default function AppShell() {
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  const [loadErr, setLoadErr] = useState("");
  const reload = useCallback(async () => {
    try {
      const d = await apiGet("data");
      if (d && Array.isArray(d.events)) { setData(d); setLoadErr(""); setLoading(false); return; }
      // no usable data — is it an auth problem? if so, bounce back to the login gate
      const a = await apiGet("auth");
      if (!a?.authed) { window.location.reload(); return; }
      setLoadErr(d?.error || "שגיאה בטעינת הנתונים"); setLoading(false);
    } catch {
      setLoadErr("שגיאת רשת בטעינת הנתונים"); setLoading(false);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // local mutators — instant UI, no reload lag
  const patch = useCallback((fn) => setData(prev => fn(structuredClone(prev))), []);

  // keep the latest committed data for rollback snapshots
  const dataRef = useRef(null);
  useEffect(() => { dataRef.current = data; }, [data]);

  // transient error toast
  const [toast, setToast] = useState(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);
  const notify = useCallback((msg) => setToast({ msg }), []);

  // optimistic mutation with rollback: apply patch, call API, restore snapshot
  // and surface the error if the call fails. Returns the API result, or null on
  // failure. Pass a null optimistic fn for "call first, apply result" flows.
  const mutate = useCallback(async (optimisticFn, apiCall) => {
    const snapshot = dataRef.current;
    if (optimisticFn) patch(optimisticFn);
    try {
      return await apiCall();
    } catch (e) {
      if (optimisticFn) setData(snapshot);
      setToast({ msg: e?.message || "הפעולה נכשלה" });
      return null;
    }
  }, [patch]);

  const reminders = useMemo(() => data ? buildReminders(data.events) : [], [data]);
  const today = new Date(); today.setHours(0,0,0,0);

  if (loading) return <div className={s.loading}>טוען את המערכת…</div>;
  if (loadErr) return <div className={s.loading}>{loadErr} · <button onClick={()=>{setLoading(true);reload();}} style={{textDecoration:"underline",background:"none",border:"none",color:"inherit",cursor:"pointer"}}>נסה שוב</button></div>;

  const TABS = [
    { id:"dashboard", label:"🏠 דשבורד" },
    { id:"events", label:"🎉 אירועים" },
    { id:"social", label:"📅 תוכנית סושיאל" },
    { id:"messages", label:"💬 הודעות" },
    { id:"library", label:"📚 מאגר" },
    { id:"reminders", label:"📨 תזכורות" },
    { id:"brands", label:"🎨 הפקות" },
  ];

  return (
    <div className={s.root}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.brandWrap}>
            <h1 className={s.h1}>A&A HAFAKOT</h1>
            <p className={s.sub}>מערכת ניהול · אירועים · תזכורות · תוכן</p>
          </div>
        </div>
        <div className={s.tabsBar}>
          <nav className={s.tabs}>{TABS.map(t => (
            <button key={t.id} className={`${s.tab} ${tab===t.id?s.tabOn:""}`} onClick={()=>setTab(t.id)}>{t.label}</button>
          ))}</nav>
        </div>
      </header>
      <main className={s.main}>
        {tab==="dashboard" && <Dashboard data={data} reminders={reminders} today={today} setTab={setTab} mutate={mutate}/>}
        {tab==="events" && <Events data={data} patch={patch} mutate={mutate} notify={notify} today={today} unlocked={unlocked} setUnlocked={setUnlocked}/>}
        {tab==="social" && <SocialPlan data={data} today={today}/>}
        {tab==="messages" && <Messages data={data} patch={patch} mutate={mutate} notify={notify} today={today}/>}
        {tab==="library" && <Library data={data} mutate={mutate}/>}
        {tab==="reminders" && <Reminders data={data} reminders={reminders} today={today} mutate={mutate}/>}
        {tab==="brands" && <BrandsTab data={data} mutate={mutate} today={today} unlocked={unlocked} setUnlocked={setUnlocked}/>}
      </main>
      <footer className={s.footer}>A&A HAFAKOT · מערכת ניהול 2026</footer>
      {toast && <div className={s.toast} role="alert">{toast.msg}</div>}
    </div>
  );
}

// ════ DASHBOARD — daily task center ════
function startOfWeek(today) { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; }

function Dashboard({ data, reminders, today, setTab, mutate }) {
  const upcoming = [...data.events].filter(e => new Date(e.date) >= today).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const next = upcoming[0];
  const remSent = data.remindersSent || {};
  const tasksDone = data.tasksDone || {};
  const weekStart = startOfWeek(today);

  // is a task done THIS week?
  const isDone = (id) => { const t = tasksDone[id]; return t && new Date(t.done_at) >= weekStart; };
  const isRemDone = (id) => !!remSent[id];

  // build today's unified agenda
  const planDays = useMemo(() => buildAllDays(data.events), [data.events]);
  const todayPlan = (planDays.find(d => diffDays(today, new Date(d.date)) === 0)?.tasks) || {};

  const agenda = [];
  // reminders due today or overdue (email/SMS)
  reminders.forEach(r => {
    if (diffDays(today, new Date(r.sendDate)) > 0) return;
    agenda.push({
      id: r.id,
      source: "reminder",
      kind: r.channel === "email" ? "מייל" : "SMS",
      icon: r.channel === "email" ? "✉" : "✆",
      brand: r.brand,
      text: r.label + " · " + r.eventName,
      urgent: diffDays(today, new Date(r.sendDate)) < 0,
      done: isRemDone(r.id),
    });
  });
  // social content tasks today
  const todayKey = toDateInput(today);
  Object.keys(todayPlan).forEach(bid => {
    todayPlan[bid].forEach((t, i) => {
      const id = "plan_" + todayKey + "_" + bid + "_" + i;
      agenda.push({
        id: id,
        source: "task",
        kind: t.type,
        icon: CH_ICON[t.ch] || "•",
        brand: bid,
        text: t.title,
        label: t.title,
        urgent: t.flag === "urgent",
        done: isDone(id),
      });
    });
  });

  const pending = agenda.filter(a => !a.done);
  const done = agenda.filter(a => a.done);

  async function mark(a, done) {
    if (a.source === "reminder") {
      await mutate(
        d => { d.remindersSent = {...d.remindersSent}; if(done) d.remindersSent[a.id]={id:a.id,sent_at:new Date().toISOString()}; else delete d.remindersSent[a.id]; return d; },
        () => apiPut("reminders", { id:a.id, sent:done }),
      );
    } else {
      await mutate(
        d => { d.tasksDone = {...d.tasksDone}; if(done) d.tasksDone[a.id]={id:a.id,done_at:new Date().toISOString()}; else delete d.tasksDone[a.id]; return d; },
        () => apiPut("tasks", { id:a.id, done, label:a.label||"", brand:a.brand }),
      );
    }
  }

  return (
    <div>
      {/* hero */}
      {next ? (
        <div className={s.hero} style={{["--accent"]:BRANDS[next.brand].glow}}>
          <div className={s.heroLabel}>האירוע הקרוב</div>
          <div className={s.heroMain}>
            <span className={s.badge} style={{background:BRANDS[next.brand].bg,color:BRANDS[next.brand].text}}>{BRANDS[next.brand].name}</span>
            <span className={s.heroName}>{next.name}</span>
          </div>
          <div className={s.heroCount}>{relDay(today, next.date)}</div>
          <div className={s.heroMeta}>{fmtDateHeb(next.date)} · יום {dowHeb(next.date)}{next.location?` · ${next.location}`:""}</div>
          <div className={s.heroActions}>
            <button className={s.btnP} onClick={()=>setTab("messages")}>💬 צור הודעות</button>
            {next.link && <a className={s.btnG} href={next.link} target="_blank" rel="noreferrer">🎫 דף האירוע</a>}
          </div>
        </div>
      ) : <div className={s.empty}>אין אירועים מתוכננים — הוסף אירוע בטאב "אירועים"</div>}

      {/* daily tasks */}
      <h3 className={s.secTitle}>📋 המשימות של היום · {fmtDateHeb(today)}</h3>
      {pending.length === 0
        ? <div className={s.empty}>אין משימות פתוחות להיום — הכל בוצע ✓</div>
        : <div className={s.list}>
            {pending.map(a => (
              <div key={a.id} className={`${s.row} ${a.urgent?s.rowOverdue:""}`} style={{borderRight:`3px solid ${BRANDS[a.brand].text}`}}>
                <button className={s.check} onClick={()=>mark(a, true)} title="סמן כבוצע"></button>
                <span className={s.agendaKind}>{a.icon} {a.kind}</span>
                <span className={s.badge} style={{background:BRANDS[a.brand].bg,color:BRANDS[a.brand].text}}>{BRANDS[a.brand].name}</span>
                <span className={s.rowText}>{a.text}</span>
                {a.urgent && <span className={s.tagOver}>דחוף</span>}
              </div>
            ))}
          </div>
      }

      {/* done this week */}
      {done.length > 0 && (
        <>
          <h3 className={s.secTitle}>✓ בוצעו ({done.length}) · מתאפס בתחילת השבוע</h3>
          <div className={s.list}>
            {done.map(a => (
              <div key={a.id} className={`${s.row} ${s.rowDone}`} style={{borderRight:`3px solid ${BRANDS[a.brand].text}`}}>
                <button className={`${s.check} ${s.checkOn}`} onClick={()=>mark(a, false)} title="בטל סימון">✓</button>
                <span className={s.agendaKind}>{a.icon} {a.kind}</span>
                <span className={s.badge} style={{background:BRANDS[a.brand].bg,color:BRANDS[a.brand].text}}>{BRANDS[a.brand].name}</span>
                <span className={s.rowText}>{a.text}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* per-brand status */}
      <h3 className={s.secTitle}>🎨 מצב ההפקות</h3>
      <div className={s.brandStatusGrid}>
        {BLIST.map(bid => {
          const bEvents = upcoming.filter(e => e.brand === bid);
          const bNext = bEvents[0];
          const bMsgs = data.messages.filter(m => m.brand === bid && m.status === "לא נשלח").length;
          return (
            <div key={bid} className={s.brandStatus} style={{borderRight:`3px solid ${BRANDS[bid].glow}`}}>
              <span className={s.badge} style={{background:BRANDS[bid].bg,color:BRANDS[bid].text}}>{BRANDS[bid].name}</span>
              <span className={s.brandStatusNext}>{bNext ? `${fmtDateHeb(bNext.date)} · ${relDay(today,bNext.date)}` : "אין אירוע"}</span>
              {bMsgs>0 && <span className={s.brandStatusMsg}>{bMsgs} הודעות לשליחה</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
function Events({ data, patch, mutate, notify, today, unlocked, setUnlocked }) {
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

// ════ SOCIAL PLAN ════
const CH_ICON = { story:"📱", post:"🖼", comm:"👥" };
function SocialPlan({ data, today }) {
  const allDays = useMemo(() => buildAllDays(data.events), [data.events]);
  const [brandFilter, setBrandFilter] = useState("all");
  const [planStart, setPlanStart] = useState(null); // null = full plan
  const [planLen, setPlanLen] = useState(21);

  const startDate = planStart ? new Date(planStart) : null;
  const windowDays = allDays.filter(d => {
    const dd = diffDays(today, new Date(d.date));
    if (startDate) { const fromStart = diffDays(startDate, new Date(d.date)); return fromStart >= 0 && fromStart <= planLen; }
    return dd >= -1 && dd <= planLen;
  });

  let totals = { story:0, post:0, comm:0 };
  windowDays.forEach(day => Object.values(day.tasks).forEach(ts => ts.forEach(t => totals[t.ch]++)));

  let curWeek = null;
  return (
    <div>
      <div className={s.planControls}>
        <div className={s.planControlText}>
          <span className={s.planControlTitle}>תוכנית התוכן הפעילה</span>
          <span className={s.planControlSub}>נגזרת אוטומטית מהאירועים · {planStart?`מתאריך ${fmtDateHeb(planStart)}`:"מהיום והלאה"}</span>
        </div>
        <div className={s.planControlBtns}>
          <button className={`${s.fbtn} ${!planStart?s.fbtnOn:""}`} onClick={()=>setPlanStart(null)}>מהיום</button>
          <button className={s.btnP} onClick={()=>setPlanStart(toDateInput(new Date()))}>🔄 תוכנית חדשה מהיום</button>
        </div>
      </div>

      <div className={s.statRow}>
        <div className={s.stat}><span className={s.statN}>{totals.story+totals.post+totals.comm}</span><span className={s.statL}>משימות</span></div>
        <div className={s.stat}><span className={s.statN}>{totals.story}</span><span className={s.statL}>סטורים</span></div>
        <div className={s.stat}><span className={s.statN}>{totals.post}</span><span className={s.statL}>פוסטים</span></div>
        <div className={s.stat}><span className={s.statN}>{totals.comm}</span><span className={s.statL}>הודעות קהילה</span></div>
      </div>

      <div className={s.filterBar}>
        {[{id:"all",name:"כל ההפקות"},...BLIST.map(id=>({id,name:BRANDS[id].name}))].map(f=>(
          <button key={f.id} className={`${s.fbtn} ${brandFilter===f.id?s.fbtnOn:""}`}
            style={brandFilter===f.id&&BRANDS[f.id]?{borderColor:BRANDS[f.id].text,color:BRANDS[f.id].text}:{}}
            onClick={()=>setBrandFilter(f.id)}>{f.name}</button>
        ))}
      </div>

      {windowDays.length===0 && <div className={s.empty}>אין משימות בטווח הזה. הוסף אירועים כדי לייצר תוכנית.</div>}
      {windowDays.map(day => {
        const d = new Date(day.date);
        const entries = Object.entries(day.tasks).filter(([bid]) => brandFilter==="all" || bid===brandFilter);
        if (!entries.length) return null;
        const wl = day.week;
        const showWeek = wl !== curWeek; if (showWeek) curWeek = wl;
        const tag = relDay(today, d);
        const isToday = diffDays(today,d)===0;
        const anyEvent = entries.some(([bid]) => day.eventBrands.includes(bid));
        return (
          <div key={day.date}>
            {showWeek && <div className={s.weekSep}>{wl}</div>}
            <div className={`${s.planDay} ${anyEvent?s.planDayEvent:""}`}>
              <div className={s.planDayHead}>
                <span className={s.planDate}>{fmtDateHeb(d)} · יום {dowHeb(d)}</span>
                {isToday && <span className={s.planToday}>היום</span>}
                {anyEvent && <span className={s.planEvent}>🎉 יום אירוע</span>}
              </div>
              {entries.map(([bid, ts]) => (
                <div key={bid} className={s.planBrandBlock}>
                  <span className={s.planBrandName} style={{background:BRANDS[bid].bg,color:BRANDS[bid].text}}>{BRANDS[bid].name}</span>
                  <div className={s.planTasks}>
                    {ts.map((t,i) => (
                      <div key={i} className={`${s.planTask} ${t.flag==="urgent"?s.planUrgent:t.flag==="key"?s.planKey:""}`}>
                        <span className={s.planIco}>{CH_ICON[t.ch]}</span>
                        <div className={s.planTaskBody}>
                          <span className={s.planType}>{t.type}</span>
                          <span className={s.planTitle}>{t.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════ MESSAGES ════
function Messages({ data, patch, mutate, today }) {
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
            <button className={s.btnWa} onClick={()=>sendComm(m.body)} title={brandComm?"מעתיק ופותח את הקהילה":"מעתיק ופותח ווטסאפ — הוסף קישור קהילה בטאב הפקות לפתיחה ישירה"}>💬 שלח לווטסאפ</button>
            {m.status!=="נשלח" && <button className={s.btnG} onClick={()=>markSent(m.id)}>✓ סמן כנשלח</button>}
          </div>
        </div>
      ))}</div>
    </div>
  );
}

// ════ REMINDERS ════
function Reminders({ data, reminders, today, mutate }) {
  const sent = data.remindersSent || {};
  async function toggle(id) {
    const isSent = !!sent[id];
    await mutate(
      d => { d.remindersSent = {...d.remindersSent}; if(isSent) delete d.remindersSent[id]; else d.remindersSent[id] = { id, sent_at:new Date().toISOString() }; return d; },
      () => apiPut("reminders", { id, sent: !isSent }),
    );
  }
  return (
    <div>
      <div className={s.note}>
        <b>איך זה עובד:</b> לכל אירוע המערכת מחשבת לבד מתי כדאי לשלוח מייל ו-SMS ללקוחות — לפי מספר הימים שנותרו לאירוע.
        פסטיבלים: מייל 14 ו-7 ימים לפני, SMS ב-3, 1 ו-0 ימים לפני. בר: מייל 3 ימים לפני, SMS ב-1 ו-0.
        כל שורה אומרת: <b>מתי לשלוח</b>, <b>איזה ערוץ</b> (מייל/SMS), <b>לאיזה אירוע</b>, ו<b>מה לכתוב</b>. סמן ✓ אחרי ששלחת.
      </div>
      <div className={s.list}>{reminders.map(r => {
        const isSent = !!sent[r.id];
        const dd = diffDays(today, new Date(r.sendDate));
        const overdue = dd < 0 && !isSent;
        const when = dd===0?"שלח היום":dd<0?`היה אמור להישלח לפני ${Math.abs(dd)} ימים`:`שלח בעוד ${dd} ימים`;
        return (
          <div key={r.id} className={`${s.remRow} ${isSent?s.rowDone:""} ${overdue?s.rowOverdue:""}`} style={{borderRight:`3px solid ${BRANDS[r.brand].text}`}}>
            <button className={`${s.check} ${isSent?s.checkOn:""}`} onClick={()=>toggle(r.id)}>{isSent?"✓":""}</button>
            <div className={s.remMain}>
              <div className={s.remTop}>
                <span className={`${s.chTag} ${r.channel==="email"?s.chEmail:s.chSms}`}>{r.channel==="email"?"✉ מייל":"✆ SMS"}</span>
                <span className={s.badge} style={{background:BRANDS[r.brand].bg,color:BRANDS[r.brand].text}}>{BRANDS[r.brand].name}</span>
                <span className={s.remWhen} style={overdue?{color:"#F0A6B2"}:{}}>{isSent?"✓ נשלח":when}</span>
              </div>
              <div className={s.remLabel}>{r.label}</div>
              <div className={s.remFor}>לאירוע: {r.eventName} · {fmtDateHeb(r.eventDate)}</div>
            </div>
          </div>
        );
      })}</div>
    </div>
  );
}

// ════ BRANDS ════
function BrandsTab({ data, mutate, today, unlocked, setUnlocked }) {
  const assets = data.brandAssets || {};
  const [draft, setDraft] = useState(assets);
  useEffect(() => setDraft(data.brandAssets || {}), [data.brandAssets]);

  async function save(bid) {
    const fields = {
      logo: draft[bid]?.logo||"", drive_link: draft[bid]?.drive_link||"",
      canva_templates: draft[bid]?.canva_templates||"", instagram_link: draft[bid]?.instagram_link||"",
      community_link: draft[bid]?.community_link||"",
    };
    await mutate(
      d => { d.brandAssets = {...d.brandAssets, [bid]: {brand:bid, ...fields}}; return d; },
      () => apiPut("brands", { brand: bid, ...fields }),
    );
  }

  return (
    <div>
      <LockGuard onChange={setUnlocked}/>
      <div className={s.brandsGrid}>{BLIST.map(bid => {
        const b = BRANDS[bid], m = draft[bid] || {};
        const bEvents = data.events.filter(e => e.brand===bid && new Date(e.date)>=today).sort((a,c)=>new Date(a.date)-new Date(c.date));
        const nextEv = bEvents[0];
        return (
          <div key={bid} className={s.brandCard} style={{borderTop:`4px solid ${b.glow}`, ["--accent"]:b.glow}}>
            <div className={s.brandHead}>
              <span className={s.badge} style={{background:b.bg,color:b.text,fontSize:13}}>{b.name}</span>
              <span className={s.brandType}>{b.type}</span>
            </div>
            {m.logo ? <img src={m.logo} alt={b.name} className={s.brandLogo}/> : <div className={s.brandLogoEmpty}>אין לוגו</div>}
            {!unlocked ? (
              <>
                <div className={s.quickRow}>
                  <a className={`${s.quickBtn} ${!m.drive_link?s.quickBtnOff:""}`} href={m.drive_link||"#"} target="_blank" rel="noreferrer"><span>📁</span><span>דרייב</span></a>
                  <a className={`${s.quickBtn} ${!m.canva_templates?s.quickBtnOff:""}`} href={m.canva_templates||"#"} target="_blank" rel="noreferrer"><span>🎨</span><span>Canva</span></a>
                  <a className={`${s.quickBtn} ${!m.instagram_link?s.quickBtnOff:""}`} href={m.instagram_link||"#"} target="_blank" rel="noreferrer"><span>📸</span><span>אינסטגרם</span></a>
                  <a className={`${s.quickBtn} ${!m.community_link?s.quickBtnOff:""}`} href={m.community_link||"#"} target="_blank" rel="noreferrer"><span>💬</span><span>קהילה</span></a>
                </div>
                <div className={s.brandNext}>
                  <span className={s.brandNextLabel}>האירוע הקרוב</span>
                  <span className={s.brandNextVal}>{nextEv ? `${nextEv.name} · ${fmtDateHeb(nextEv.date)} (${relDay(today,nextEv.date)})` : "אין אירוע מתוכנן"}</span>
                  <span className={s.brandNextCount}>{bEvents.length} עתידיים</span>
                </div>
              </>
            ) : (
              <>
                <label className={s.field}><span>לוגו (URL)</span><input dir="ltr" value={m.logo||""} onChange={e=>setDraft({...draft,[bid]:{...m,logo:e.target.value}})} placeholder="https://i.imgur.com/...png"/></label>
                <label className={s.field}><span>📁 תיקיית דרייב</span><input dir="ltr" value={m.drive_link||""} onChange={e=>setDraft({...draft,[bid]:{...m,drive_link:e.target.value}})}/></label>
                <label className={s.field}><span>🎨 תיקיית Canva</span><input dir="ltr" value={m.canva_templates||""} onChange={e=>setDraft({...draft,[bid]:{...m,canva_templates:e.target.value}})}/></label>
                <label className={s.field}><span>📸 עמוד אינסטגרם</span><input dir="ltr" value={m.instagram_link||""} onChange={e=>setDraft({...draft,[bid]:{...m,instagram_link:e.target.value}})}/></label>
                <label className={s.field}><span>💬 קהילת ווטסאפ</span><input dir="ltr" value={m.community_link||""} onChange={e=>setDraft({...draft,[bid]:{...m,community_link:e.target.value}})}/></label>
                <div className={s.brandActs}><button className={s.btnP} onClick={()=>save(bid)}>שמור</button></div>
              </>
            )}
          </div>
        );
      })}</div>
    </div>
  );
}

// ════ LIBRARY — asset repository of all generated messages ════
function Library({ data, mutate }) {
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
