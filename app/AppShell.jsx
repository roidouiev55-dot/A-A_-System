"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { buildReminders } from "../lib/core";
import { apiGet } from "./api-client";
import Dashboard from "./tabs/Dashboard";
import Events from "./tabs/Events";
import SocialPlan from "./tabs/SocialPlan";
import Messages from "./tabs/Messages";
import Reminders from "./tabs/Reminders";
import BrandsTab from "./tabs/BrandsTab";
import ContentTrainer from "./tabs/ContentTrainer";
import Library from "./tabs/Library";
import s from "./app.module.css";

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
    { id:"trainer", label:"🎯 מאמן התוכן" },
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
        {tab==="social" && <SocialPlan data={data} today={today} unlocked={unlocked} setUnlocked={setUnlocked}/>}
        {tab==="messages" && <Messages data={data} patch={patch} mutate={mutate} notify={notify} today={today}/>}
        {tab==="library" && <Library data={data} mutate={mutate}/>}
        {tab==="reminders" && <Reminders data={data} reminders={reminders} today={today} mutate={mutate}/>}
        {tab==="brands" && <BrandsTab data={data} mutate={mutate} today={today} unlocked={unlocked} setUnlocked={setUnlocked}/>}
        {tab==="trainer" && <ContentTrainer data={data}/>}
      </main>
      <footer className={s.footer}>A&A HAFAKOT · מערכת ניהול 2026</footer>
      {toast && <div className={s.toast} role="alert">{toast.msg}</div>}
    </div>
  );
}
