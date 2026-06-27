"use client";
import { useState, useMemo } from "react";
import { BRANDS, BLIST, fmtDateHeb, dowHeb, diffDays, toDateInput } from "../../lib/core";
import { buildAllDays } from "../../lib/socialplan";
import { relDay, CH_ICON } from "../shared";
import s from "../app.module.css";

// ════ SOCIAL PLAN ════
export default function SocialPlan({ data, today }) {
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
