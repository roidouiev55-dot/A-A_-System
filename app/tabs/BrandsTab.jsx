"use client";
import { useState, useEffect } from "react";
import { BRANDS, BLIST, fmtDateHeb } from "../../lib/core";
import { apiPut } from "../api-client";
import { relDay } from "../shared";
import LockGuard from "../LockGuard";
import s from "../app.module.css";

// Global asset folders — shared across all productions.
const GFIELDS = [
  { key: "videos", label: "🎬 תיקיית סרטונים" },
  { key: "images", label: "🖼️ תיקיית תמונות" },
  { key: "logos", label: "🏷️ תיקיית לוגואים" },
  { key: "graphics", label: "🎨 תיקיית גרפיקות" },
  { key: "canva_posts", label: "📝 קאנבה של פוסטים" },
];

// ════ BRANDS ════
export default function BrandsTab({ data, mutate, today, unlocked, setUnlocked }) {
  const assets = data.brandAssets || {};
  const [draft, setDraft] = useState(assets);
  useEffect(() => setDraft(data.brandAssets || {}), [data.brandAssets]);

  const [gf, setGf] = useState(data.generalFolders || {});
  useEffect(() => setGf(data.generalFolders || {}), [data.generalFolders]);

  async function save(bid) {
    // drive_link/community_link are intentionally not sent — their DB columns are
    // kept (data preserved) but no longer surfaced in the UI.
    const fields = {
      logo: draft[bid]?.logo || "",
      canva_templates: draft[bid]?.canva_templates || "",
      instagram_link: draft[bid]?.instagram_link || "",
    };
    await mutate(
      d => { d.brandAssets = { ...d.brandAssets, [bid]: { ...d.brandAssets?.[bid], brand: bid, ...fields } }; return d; },
      () => apiPut("brands", { brand: bid, ...fields }),
    );
  }

  async function saveGeneral() {
    const fields = Object.fromEntries(GFIELDS.map(f => [f.key, gf[f.key] || ""]));
    await mutate(
      d => { d.generalFolders = { ...d.generalFolders, ...fields }; return d; },
      () => apiPut("general-folders", fields),
    );
  }

  return (
    <div>
      <LockGuard onChange={setUnlocked}/>

      <div className={s.card}>
        <div className={s.cardLabel}>📂 תיקיות כלליות</div>
        {!unlocked ? (
          <div className={s.quickRow}>
            {GFIELDS.map(f => (
              <a key={f.key} className={`${s.quickBtn} ${!gf[f.key]?s.quickBtnOff:""}`} href={gf[f.key]||"#"} target="_blank" rel="noreferrer">
                <span>{f.label.split(" ")[0]}</span><span>{f.label.split(" ").slice(1).join(" ")}</span>
              </a>
            ))}
          </div>
        ) : (
          <div className={s.formGrid}>
            {GFIELDS.map(f => (
              <label key={f.key} className={s.fieldW}><span>{f.label}</span>
                <input dir="ltr" value={gf[f.key]||""} onChange={e=>setGf({...gf,[f.key]:e.target.value})} placeholder="https://..."/>
              </label>
            ))}
            <div className={s.brandActs}><button className={s.btnP} onClick={saveGeneral}>שמור תיקיות</button></div>
          </div>
        )}
      </div>

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
                  <a className={`${s.quickBtn} ${!m.canva_templates?s.quickBtnOff:""}`} href={m.canva_templates||"#"} target="_blank" rel="noreferrer"><span>🎨</span><span>Canva</span></a>
                  <a className={`${s.quickBtn} ${!m.instagram_link?s.quickBtnOff:""}`} href={m.instagram_link||"#"} target="_blank" rel="noreferrer"><span>📸</span><span>אינסטגרם</span></a>
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
                <label className={s.field}><span>🎨 קישור לקאנבה האישית</span><input dir="ltr" value={m.canva_templates||""} onChange={e=>setDraft({...draft,[bid]:{...m,canva_templates:e.target.value}})}/></label>
                <label className={s.field}><span>📸 עמוד אינסטגרם</span><input dir="ltr" value={m.instagram_link||""} onChange={e=>setDraft({...draft,[bid]:{...m,instagram_link:e.target.value}})}/></label>
                <div className={s.brandActs}><button className={s.btnP} onClick={()=>save(bid)}>שמור</button></div>
              </>
            )}
          </div>
        );
      })}</div>
    </div>
  );
}
