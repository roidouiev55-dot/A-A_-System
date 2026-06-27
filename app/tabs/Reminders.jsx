"use client";
import { BRANDS, fmtDateHeb, diffDays } from "../../lib/core";
import { apiPut } from "../api-client";
import s from "../app.module.css";

// ════ REMINDERS ════
export default function Reminders({ data, reminders, today, mutate }) {
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
