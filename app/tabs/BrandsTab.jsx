"use client";
import { useState, useEffect } from "react";
import { BRANDS, BLIST, fmtDateHeb } from "../../lib/core";
import { apiPut } from "../api-client";
import { relDay } from "../shared";
import LockGuard from "../LockGuard";
import s from "../app.module.css";

// ════ BRANDS ════
export default function BrandsTab({ data, mutate, today, unlocked, setUnlocked }) {
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
