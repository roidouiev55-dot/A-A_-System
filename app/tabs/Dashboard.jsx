"use client";
import { useMemo } from "react";
import { BRANDS, BLIST, fmtDateHeb, dowHeb, diffDays, toDateInput } from "../../lib/core";
import { buildAllDays } from "../../lib/socialplan";
import { apiPut } from "../api-client";
import { relDay, CH_ICON } from "../shared";
import s from "../app.module.css";

// ════ DASHBOARD — daily task center ════
function startOfWeek(today) { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; }

export default function Dashboard({ data, reminders, today, setTab, mutate }) {
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
