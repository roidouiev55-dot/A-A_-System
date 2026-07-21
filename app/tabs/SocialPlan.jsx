"use client";
import { useState, useMemo } from "react";
import { BRANDS, fmtDateHeb, fmtDateFull, dowHeb, diffDays } from "../../lib/core";
import { buildAllDays } from "../../lib/socialplan";
import { CH_ICON } from "../shared";
import s from "../app.module.css";

// Brands shown in the plan (WB is excluded by the engine too).
const PLAN_BRANDS = ["WN", "MX", "BG"];

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Build a self-contained, print-optimised HTML document (light, RTL, professional)
// with no trace of the app itself — suitable for sending to an external partner.
function buildPrintDoc(windowDays, brands) {
  const dated = windowDays.filter(d => brands.some(b => d.tasks[b]));
  const first = dated[0] && new Date(dated[0].date);
  const last = dated.length && new Date(dated[dated.length - 1].date);
  const range = first ? `${fmtDateFull(first)} – ${fmtDateFull(last)}` : "";

  const brandSections = brands.map(bid => {
    const B = BRANDS[bid];
    // tag tasks with their event only when this brand has more than one event
    const evKeys = new Set();
    dated.forEach(day => (day.tasks[bid] || []).forEach(t => evKeys.add(t.evKey)));
    const showEv = evKeys.size > 1;
    const rows = [];
    let curWeek = null;
    dated.forEach(day => {
      const ts = day.tasks[bid];
      if (!ts) return;
      if (day.week !== curWeek) { curWeek = day.week; rows.push(`<tr class="wk"><td colspan="2">${esc(day.week)}</td></tr>`); }
      const d = new Date(day.date);
      const tasksHtml = ts.map(t => {
        const evLabel = t.evName || (t.evDate ? fmtDateHeb(new Date(t.evDate)) : "");
        const evTag = showEv && evLabel ? `<span class="ev">${esc(evLabel)}</span>` : "";
        return `<div class="task"><span class="ic">${CH_ICON[t.ch] || "•"}</span><span class="ty">${esc(t.type)}</span>${evTag} ${esc(t.title)}</div>`;
      }).join("");
      rows.push(`<tr><td class="dcell">${esc(fmtDateHeb(d))}<br><span class="dow">יום ${esc(dowHeb(d))}</span></td><td>${tasksHtml}</td></tr>`);
    });
    if (!rows.length) return "";
    return `<section class="brand">
      <h2 style="background:${B.bg};color:${B.text}">${esc(B.name)} · ${esc(B.type)}</h2>
      <table>${rows.join("")}</table>
    </section>`;
  }).join("");

  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8">
  <title>תוכנית תוכן</title>
  <style>
    @page { margin: 18mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", "Arial", "Frank Ruhl Libre", sans-serif; color: #1c1c22; background: #fff; margin: 0; padding: 24px; line-height: 1.5; }
    header { border-bottom: 3px solid #b08b3f; padding-bottom: 14px; margin-bottom: 26px; }
    header h1 { font-size: 26px; margin: 0 0 4px; font-weight: 800; letter-spacing: .01em; }
    header .range { font-size: 14px; color: #555; font-weight: 600; }
    section.brand { margin-bottom: 30px; page-break-inside: avoid; }
    section.brand h2 { font-size: 18px; font-weight: 800; padding: 9px 16px; border-radius: 8px; margin: 0 0 10px; }
    table { width: 100%; border-collapse: collapse; }
    tr.wk td { font-size: 13px; font-weight: 800; color: #b08b3f; padding: 14px 4px 5px; border-bottom: 1px solid #e3e3e3; letter-spacing: .04em; }
    td { vertical-align: top; padding: 8px 4px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
    td.dcell { width: 130px; font-weight: 700; white-space: nowrap; color: #33333b; }
    td.dcell .dow { font-weight: 500; font-size: 11.5px; color: #888; }
    .task { padding: 3px 0; }
    .task .ic { margin-left: 6px; }
    .task .ty { font-weight: 800; color: #7a5a1e; font-size: 11.5px; }
    .task .ev { font-weight: 800; font-size: 10px; color: #444; background: #f0ece0; border: 1px solid #e0d8c4; border-radius: 100px; padding: 1px 7px; margin: 0 4px; white-space: nowrap; }
    footer { margin-top: 30px; text-align: center; font-size: 11px; color: #aaa; }
  </style></head><body>
  <header><h1>תוכנית תוכן</h1><div class="range">${esc(range)}</div></header>
  ${brandSections || '<p style="color:#888">אין משימות בטווח שנבחר.</p>'}
  <footer>הופק ${esc(fmtDateFull(new Date()))}</footer>
  </body></html>`;
}

// ════ SOCIAL PLAN ════
export default function SocialPlan({ data, today }) {
  const allDays = useMemo(() => buildAllDays(data.events), [data.events]);
  // brand selection — drives both the on-screen view and the PDF export
  const [selected, setSelected] = useState(() => new Set(PLAN_BRANDS));

  const windowDays = allDays.filter(d => diffDays(today, new Date(d.date)) >= -1);
  const visibleBrands = PLAN_BRANDS.filter(b => selected.has(b));

  // Brands that have more than one distinct event in the window — only for these
  // do we tag each task with its owning event, to keep single-event brands clean.
  const multiEventBrands = useMemo(() => {
    const perBrand = {};
    windowDays.forEach(d => PLAN_BRANDS.forEach(b => (d.tasks[b] || []).forEach(t => {
      (perBrand[b] = perBrand[b] || new Set()).add(t.evKey);
    })));
    return new Set(PLAN_BRANDS.filter(b => perBrand[b] && perBrand[b].size > 1));
  }, [windowDays]);

  const totals = { story: 0, post: 0, comm: 0 };
  windowDays.forEach(day => visibleBrands.forEach(bid => (day.tasks[bid] || []).forEach(t => { if (totals[t.ch] != null) totals[t.ch]++; })));

  function toggle(bid) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(bid)) { if (n.size > 1) n.delete(bid); } else n.add(bid);
      return n;
    });
  }

  function exportPDF() {
    const html = buildPrintDoc(windowDays, PLAN_BRANDS.filter(b => selected.has(b)));
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    const go = () => { try { w.print(); } catch {} };
    if (w.document.readyState === "complete") setTimeout(go, 250); else w.onload = () => setTimeout(go, 250);
  }

  let curWeek = null;
  return (
    <div>
      <div className={s.planControls}>
        <div className={s.planControlText}>
          <span className={s.planControlTitle}>תוכנית התוכן הפעילה</span>
          <span className={s.planControlSub}>נגזרת אוטומטית מהאירועים · מהיום ועד שבוע וחצי אחרי כל אירוע</span>
        </div>
        <div className={s.planControlBtns}>
          <button className={s.btnP} onClick={exportPDF}>🖨 ייצא ל-PDF</button>
        </div>
      </div>

      <div className={s.statRow}>
        <div className={s.stat}><span className={s.statN}>{totals.story + totals.post + totals.comm}</span><span className={s.statL}>משימות</span></div>
        <div className={s.stat}><span className={s.statN}>{totals.story}</span><span className={s.statL}>סטורים</span></div>
        <div className={s.stat}><span className={s.statN}>{totals.post}</span><span className={s.statL}>פוסטים</span></div>
        <div className={s.stat}><span className={s.statN}>{totals.comm}</span><span className={s.statL}>הודעות קהילה</span></div>
      </div>

      <div className={s.filterBar}>
        {PLAN_BRANDS.map(bid => {
          const on = selected.has(bid);
          return (
            <button key={bid} className={`${s.fbtn} ${on ? s.fbtnOn : ""}`}
              style={on ? { borderColor: BRANDS[bid].text, color: BRANDS[bid].text } : {}}
              onClick={() => toggle(bid)}>{on ? "✓ " : ""}{BRANDS[bid].name}</button>
          );
        })}
      </div>

      {visibleBrands.length === 0 && <div className={s.empty}>בחר לפחות הפקה אחת.</div>}
      {visibleBrands.length > 0 && windowDays.every(d => !visibleBrands.some(b => d.tasks[b])) &&
        <div className={s.empty}>אין משימות בטווח הזה. הוסף אירועים כדי לייצר תוכנית.</div>}

      {windowDays.map(day => {
        const d = new Date(day.date);
        const entries = visibleBrands.filter(b => day.tasks[b]).map(b => [b, day.tasks[b]]);
        if (!entries.length) return null;
        const wl = day.week;
        const showWeek = wl !== curWeek; if (showWeek) curWeek = wl;
        const isToday = diffDays(today, d) === 0;
        const anyEvent = entries.some(([bid]) => day.eventBrands.includes(bid));
        return (
          <div key={day.date}>
            {showWeek && <div className={s.weekSep}>{wl}</div>}
            <div className={`${s.planDay} ${anyEvent ? s.planDayEvent : ""}`}>
              <div className={s.planDayHead}>
                <span className={s.planDate}>{fmtDateHeb(d)} · יום {dowHeb(d)}</span>
                {isToday && <span className={s.planToday}>היום</span>}
                {anyEvent && <span className={s.planEvent}>🎉 יום אירוע</span>}
              </div>
              {entries.map(([bid, ts]) => (
                <div key={bid} className={s.planBrandBlock}>
                  <span className={s.planBrandName} style={{ background: BRANDS[bid].bg, color: BRANDS[bid].text }}>{BRANDS[bid].name}</span>
                  <div className={s.planTasks}>
                    {ts.map((t, i) => (
                      <div key={i} className={`${s.planTask} ${t.flag === "urgent" ? s.planUrgent : t.flag === "key" ? s.planKey : ""}`}>
                        <span className={s.planIco}>{CH_ICON[t.ch]}</span>
                        <div className={s.planTaskBody}>
                          <div className={s.planTypeRow}>
                            <span className={s.planType}>{t.type}</span>
                            {multiEventBrands.has(bid) && (t.evName || t.evDate) &&
                              <span className={s.planEvTag} style={{ color: BRANDS[bid].text }}>{t.evName || fmtDateHeb(new Date(t.evDate))}</span>}
                          </div>
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
