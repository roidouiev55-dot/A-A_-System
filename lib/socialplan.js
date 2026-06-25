// Social content plan — derived from events.
// Weekly: 4 story days, weekly post, 2 community msgs.
// Per event: countdown (2d before), day-before extras (community + 2 last stories,
// one with tickets link), event-day live coverage OR next-day carousel recap.
import { addDays, sameDay, diffDays, fmtDate } from "./core";

let EVENTS = { WN: [], MX: [], BG: [], WB: [] };
let EVENTMAP = {}; // bid -> [{date, link, name}]
let START = new Date(2026, 5, 18);
let END = new Date(2026, 6, 17);

function configure(events) {
  EVENTS = { WN: [], MX: [], BG: [], WB: [] };
  EVENTMAP = { WN: [], MX: [], BG: [], WB: [] };
  (events || []).forEach(ev => {
    if (EVENTS[ev.brand]) { EVENTS[ev.brand].push(new Date(ev.date)); EVENTMAP[ev.brand].push(ev); }
  });
  Object.keys(EVENTS).forEach(k => EVENTS[k].sort((a, b) => a - b));
  const all = (events || []).map(e => new Date(e.date)).sort((a, b) => a - b);
  if (all.length) {
    START = addDays(all[0], -14);
    END = addDays(all[all.length - 1], 2);
    const floor = new Date(2026, 5, 18);
    if (START < floor) START = floor;
  } else { START = new Date(2026, 5, 18); END = new Date(2026, 6, 17); }
}

function nextEvent(bid, d) { return EVENTS[bid].find(e => e >= d) || null; }
function daysToEvent(bid, d) { const e = nextEvent(bid, d); return e ? diffDays(d, e) : 99; }
function eventOn(bid, d, offset) {
  // returns the event object whose date is `offset` days after d (offset can be negative)
  return (EVENTMAP[bid] || []).find(ev => sameDay(addDays(new Date(ev.date), offset), d)) || null;
}
export function isEventDay(bid, d) { return EVENTS[bid].some(e => sameDay(e, d)); }

const FLAVOR = {
  WN: { comi: "סטורי קומי — מם/טקסט קליל על יין או על 'מי שמגיע לפסטיבל'", vibe: "סטורי אווירה — קליפ/תמונה מפסטיבל קודם, אנרגיה" },
  MX: { comi: "סטורי קומי — בדיחת קוקטיילים / 'סוגי שתיינים'", vibe: "סטורי אווירה — קליפ מהבר, תאורה, קוקטייל בהילוך איטי" },
  BG: { comi: "סטורי קומי — הומור גלילי / 'שישי בצפון'", vibe: "סטורי אווירה — נוף גלילי, שקיעה, כוסות יין" },
  WB: { comi: "סטורי קומי — קליל על 'חמישי בבר' / חיי בנימינה", vibe: "סטורי אווירה — פינות הבר, יין נמזג, תאורה חמה" },
};

function storyForSlot(bid, slot, dte) {
  const f = FLAVOR[bid];
  if (dte <= 4 && slot === 1) return { ch: "story", type: "סטורי כרטיסים", title: `סטורי כרטיסים — 'עוד ${dte} ימים, כרטיסים בלינק'`, flag: "key" };
  switch (slot) {
    case 0: return { ch: "story", type: "סטורי אווירה", title: f.vibe };
    case 1: return { ch: "story", type: "סטורי כרטיסים", title: "סטורי כרטיסים — תזכורת לאירוע הקרוב + לינק" };
    case 2: return { ch: "story", type: "סטורי סקר", title: "סטורי סקר — שאלה אינטראקטיבית לקהל (תמונה)" };
    case 3: return { ch: "story", type: "סטורי קומי", title: f.comi };
    default: return { ch: "story", type: "סטורי אווירה", title: f.vibe };
  }
}

function buildBrand(bid, d) {
  const tasks = [];
  const wd = d.getDay();
  const dte = daysToEvent(bid, d);

  // ── event day → live coverage ──
  if (isEventDay(bid, d)) {
    tasks.push({ ch: "story", type: "סיקור לייב", flag: "urgent", title: "🎉 יום האירוע — סיקור לייב לאורך הערב (5-7 סטורי)" });
    tasks.push({ ch: "comm", type: "עדכון חי", flag: "urgent", title: "הודעת קהילה: 'אנחנו חיים! בואו' + לינק" });
    return tasks;
  }

  // ── day after event → carousel recap (alternative to live; flexible) ──
  if (eventOn(bid, d, 1)) {
    tasks.push({ ch: "post", type: "פוסט קרוסלה", flag: "key", title: "פוסט קרוסלה — תמונות מהאירוע + תודות (אפשר במקום הסיקור החי)" });
    return tasks;
  }

  // ── day before event → extra community + 2 last stories ──
  if (dte === 1) {
    tasks.push({ ch: "comm", type: "הודעת קהילה", flag: "urgent", title: "הודעת קהילה נוספת — 'מחר!' פרטים אחרונים + לינק" });
    tasks.push({ ch: "story", type: "סטורי אחרון", flag: "key", title: "סטורי אחרון #1 — אווירה/טיזר 'מחר נתראה'" });
    tasks.push({ ch: "story", type: "סטורי כרטיסים", flag: "urgent", title: "סטורי אחרון #2 — 'הזדמנות אחרונה לכרטיסים' + קישור 🎟" });
    return tasks;
  }

  // ── countdown story, 2 days before ──
  if (dte === 2) {
    tasks.push({ ch: "story", type: "ספירה לאחור", flag: "key", title: "סטורי ספירה לאחור — 'עוד יומיים!' עם סטיקר countdown" });
  }

  // ── weekly rhythm ──
  if (wd === 0) {
    tasks.push(dte <= 7 && dte > 0
      ? { ch: "post", type: "פוסט סקירת אירוע", flag: "key", title: `פוסט חשיפת אירוע — ${(()=>{const e=nextEvent(bid,d);return e?fmtDate(e):"";})()} (קרוסלה / ריל) + פתיחת מכירה` }
      : { ch: "post", type: "פוסט", title: "פוסט שבועי — קרוסלת תמונות / ריל אווירה" });
    tasks.push(storyForSlot(bid, 0, dte));
  }
  if (wd === 2) {
    tasks.push(storyForSlot(bid, 1, dte));
    tasks.push({ ch: "comm", type: "הודעת קהילה", title: "הודעת קהילה #1 — ערך/טיזר אמצע שבוע" });
  }
  if (wd === 3) {
    tasks.push(storyForSlot(bid, 2, dte));
  }
  if (wd === 4) {
    tasks.push(storyForSlot(bid, 3, dte));
    tasks.push({ ch: "comm", type: "הודעת קהילה", flag: dte <= 3 ? "key" : undefined, title: dte <= 3 ? "הודעת קהילה #2 — CTA לאירוע + לינק" : "הודעת קהילה #2 — תזכורת שבועית" });
  }
  return tasks;
}

const BLIST_LOCAL = ["WN", "MX", "BG", "WB"];

export function buildAllDays(events) {
  configure(events);
  const days = [];
  for (let d = new Date(START); d <= END; d = addDays(d, 1)) {
    const day = { date: new Date(d), tasks: {} };
    for (const bid of BLIST_LOCAL) {
      const t = buildBrand(bid, new Date(d));
      if (t && t.length) day.tasks[bid] = t;
    }
    if (Object.keys(day.tasks).length) days.push(day);
  }
  return days;
}

export function weekLabel(d) {
  const startSun = new Date(START); startSun.setDate(startSun.getDate() - startSun.getDay());
  const w = Math.floor(diffDays(startSun, new Date(d)) / 7) + 1;
  return `שבוע ${w}`;
}

// expose for dashboard: today's tasks across brands as flat list
export function tasksForDate(events, date) {
  const all = buildAllDays(events);
  const day = all.find(d => sameDay(d.date, date));
  if (!day) return [];
  const out = [];
  Object.entries(day.tasks).forEach(([bid, ts]) => ts.forEach((t, i) => {
    out.push({ ...t, brand: bid, key: `plan_${date.toISOString().slice(0,10)}_${bid}_${i}` });
  }));
  return out;
}
