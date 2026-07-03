"use client";
import { useMemo } from "react";
import { diffDays, toDateInput, addDays } from "../../lib/core";
import { buildAllDays } from "../../lib/socialplan";
import { apiPut } from "../api-client";
import HeroWidget from "./dashboard/HeroWidget";
import TasksWidget from "./dashboard/TasksWidget";
import SocialWidget from "./dashboard/SocialWidget";
import WeekWidget from "./dashboard/WeekWidget";
import AlertsWidget from "./dashboard/AlertsWidget";
import NoteWidget from "./dashboard/NoteWidget";
import MonthEventsWidget from "./dashboard/MonthEventsWidget";
import s from "../app.module.css";

// ════ DASHBOARD — modern widget board · "what matters now" ════
const CH_EMOJI = { story: "📱", post: "📄", comm: "💬" };

function startOfWeek(today) { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }

export default function Dashboard({ data, reminders, today, setTab, mutate }) {
  const upcoming = useMemo(
    () => [...data.events].filter(e => new Date(e.date) >= today).sort((a, b) => new Date(a.date) - new Date(b.date)),
    [data.events, today],
  );
  const next = upcoming[0];

  const remSent = data.remindersSent || {};
  const tasksDone = data.tasksDone || {};
  const weekStart = startOfWeek(today);
  const isDone = (id) => { const t = tasksDone[id]; return t && new Date(t.done_at) >= weekStart; };
  const isRemDone = (id) => !!remSent[id];

  const planDays = useMemo(() => buildAllDays(data.events), [data.events]);
  const todayKey = toDateInput(today);
  const todayPlan = useMemo(
    () => (planDays.find(d => diffDays(today, new Date(d.date)) === 0)?.tasks) || {},
    [planDays, today],
  );

  // ── today's actionable tasks: social content + reminders due exactly today ──
  const tasks = [];
  reminders.forEach(r => {
    if (diffDays(today, new Date(r.sendDate)) !== 0 || isRemDone(r.id)) return;
    tasks.push({
      id: r.id, source: "reminder",
      icon: r.channel === "email" ? "📧" : "📨",
      brand: r.brand, text: `${r.label} · ${r.eventName}`,
    });
  });
  Object.keys(todayPlan).forEach(bid => {
    todayPlan[bid].forEach((t, i) => {
      const id = `plan_${todayKey}_${bid}_${i}`;
      if (isDone(id)) return;
      tasks.push({
        id, source: "task", icon: CH_EMOJI[t.ch] || "•",
        brand: bid, text: t.title, label: t.title, urgent: t.flag === "urgent",
      });
    });
  });

  // ── social progress: X uploaded (=done) / Y required, per channel today ──
  const social = { story: { x: 0, y: 0 }, post: { x: 0, y: 0 }, comm: { x: 0, y: 0 } };
  Object.keys(todayPlan).forEach(bid => {
    todayPlan[bid].forEach((t, i) => {
      if (!social[t.ch]) return;
      social[t.ch].y++;
      if (isDone(`plan_${todayKey}_${bid}_${i}`)) social[t.ch].x++;
    });
  });
  const pendingContent = Object.values(social).reduce((n, c) => n + (c.y - c.x), 0);

  // ── week strip: 7 days from today ──
  const weekDays = useMemo(() => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const dt = addDays(today, i);
      const key = toDateInput(dt);
      const pd = planDays.find(d => toDateInput(new Date(d.date)) === key);
      const dayEvents = upcoming.filter(e => toDateInput(new Date(e.date)) === key).map(e => ({ name: e.name, brand: e.brand }));
      const taskBrands = pd ? Object.keys(pd.tasks) : [];
      const dots = [...new Set([...dayEvents.map(e => e.brand), ...taskBrands])];
      const dayTasks = taskBrands.map(bid => ({ brand: bid, icon: "📱", count: pd.tasks[bid].length }));
      out.push({ date: dt, dots, events: dayEvents, tasks: dayTasks });
    }
    return out;
  }, [planDays, upcoming, today]);

  // ── alerts: urgent problems only ──
  const alerts = [];
  const hour = new Date().getHours();
  reminders.forEach(r => {
    if (diffDays(today, new Date(r.sendDate)) < 0 && !isRemDone(r.id))
      alerts.push({ level: "urgent", text: `תזכורת שלא נשלחה: ${r.label} · ${r.eventName}`, tab: "reminders" });
  });
  if (hour >= 16 && pendingContent > 0)
    alerts.push({ level: "urgent", text: `${pendingContent} פריטי תוכן להיום טרם הועלו`, tab: "social" });
  upcoming.forEach(e => {
    const dd = diffDays(today, new Date(e.date));
    if ((dd === 0 || dd === 1) && !e.link)
      alerts.push({ level: "warn", text: `אירוע "${e.name}" מתקרב וללא קישור כרטיסים`, tab: "events" });
  });

  // ── this month's events ──
  const monthEvents = useMemo(
    () => [...data.events]
      .filter(e => { const d = new Date(e.date); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); })
      .sort((a, b) => new Date(a.date) - new Date(b.date)),
    [data.events, today],
  );

  async function onDone(t) {
    if (t.source === "reminder") {
      await mutate(
        d => { d.remindersSent = { ...d.remindersSent }; d.remindersSent[t.id] = { id: t.id, sent_at: new Date().toISOString() }; return d; },
        () => apiPut("reminders", { id: t.id, sent: true }),
      );
    } else {
      await mutate(
        d => { d.tasksDone = { ...d.tasksDone }; d.tasksDone[t.id] = { id: t.id, done_at: new Date().toISOString() }; return d; },
        () => apiPut("tasks", { id: t.id, done: true, label: t.label || "", brand: t.brand }),
      );
    }
  }

  const hasAlerts = alerts.length > 0;

  return (
    <div className={`${s.wgrid} ${hasAlerts ? "" : s.wgridNoAlerts}`}>
      <HeroWidget next={next} setTab={setTab} />
      <TasksWidget tasks={tasks} onDone={onDone} />
      <SocialWidget social={social} setTab={setTab} />
      <MonthEventsWidget events={monthEvents} setTab={setTab} />
      <WeekWidget days={weekDays} setTab={setTab} />
      <NoteWidget initialNote={data.personalNote || ""} ready={data.personalNoteReady !== false} />
      {hasAlerts && <AlertsWidget alerts={alerts} setTab={setTab} />}
    </div>
  );
}
