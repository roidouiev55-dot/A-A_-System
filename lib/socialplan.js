// Social content plan — derived from events.
// Weekly: 4 story days, weekly post, 2 community msgs.
// Per event: countdown (2d before), day-before extras (community + 2 last stories,
// one with tickets link), event-day live coverage OR next-day carousel recap.
//
// All state lives in a per-call `ctx` object — there is no module-level mutable
// state, so a result never depends on the order or timing of previous calls.
import { addDays, sameDay, diffDays, fmtDate } from "./core";

const BLIST_LOCAL = ["WN", "MX", "BG", "WB"];
const floorDate = () => new Date(2026, 5, 18);
const defaultEnd = () => new Date(2026, 6, 17);

function configure(events) {
  const EVENTS = { WN: [], MX: [], BG: [], WB: [] };
  const EVENTMAP = { WN: [], MX: [], BG: [], WB: [] };
  (events || []).forEach(ev => {
    if (EVENTS[ev.brand]) { EVENTS[ev.brand].push(new Date(ev.date)); EVENTMAP[ev.brand].push(ev); }
  });
  Object.keys(EVENTS).forEach(k => EVENTS[k].sort((a, b) => a - b));

  let START, END;
  const all = (events || []).map(e => new Date(e.date)).sort((a, b) => a - b);
  if (all.length) {
    START = addDays(all[0], -14);
    END = addDays(all[all.length - 1], 2);
    const floor = floorDate();
    if (START < floor) START = floor;
  } else {
    START = floorDate();
    END = defaultEnd();
  }
  return { EVENTS, EVENTMAP, START, END };
}

function nextEvent(ctx, bid, d) { return ctx.EVENTS[bid].find(e => e >= d) || null; }
function daysToEvent(ctx, bid, d) { const e = nextEvent(ctx, bid, d); return e ? diffDays(d, e) : 99; }
function eventOn(ctx, bid, d, offset) {
  // returns the event object whose date is `offset` days after d (offset can be negative)
  return (ctx.EVENTMAP[bid] || []).find(ev => sameDay(addDays(new Date(ev.date), offset), d)) || null;
}
function isEventDay(ctx, bid, d) { return ctx.EVENTS[bid].some(e => sameDay(e, d)); }

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

function buildBrand(ctx, bid, d) {
  const tasks = [];
  const wd = d.getDay();
  const dte = daysToEvent(ctx, bid, d);

  // ── event day → live coverage ──
  if (isEventDay(ctx, bid, d)) {
    tasks.push({ ch: "story", type: "סיקור לייב", flag: "urgent", title: "🎉 יום האירוע — סיקור לייב לאורך הערב (5-7 סטורי)" });
    tasks.push({ ch: "comm", type: "עדכון חי", flag: "urgent", title: "הודעת קהילה: 'אנחנו חיים! בואו' + לינק" });
    return tasks;
  }

  // ── day after event → carousel recap (alternative to live; flexible) ──
  if (eventOn(ctx, bid, d, 1)) {
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
      ? { ch: "post", type: "פוסט סקירת אירוע", flag: "key", title: `פוסט חשיפת אירוע — ${(()=>{const e=nextEvent(ctx,bid,d);return e?fmtDate(e):"";})()} (קרוסלה / ריל) + פתיחת מכירה` }
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

function weekLabelFor(start, d) {
  const startSun = new Date(start); startSun.setDate(startSun.getDate() - startSun.getDay());
  const w = Math.floor(diffDays(startSun, new Date(d)) / 7) + 1;
  return `שבוע ${w}`;
}

// Each returned day carries everything the UI needs — its tasks, the brands that
// have an event that day (`eventBrands`), and its week label — so consumers never
// have to call back into this module with hidden shared state.
export function buildAllDays(events) {
  const ctx = configure(events);
  const days = [];
  for (let d = new Date(ctx.START); d <= ctx.END; d = addDays(d, 1)) {
    const tasks = {};
    const eventBrands = [];
    for (const bid of BLIST_LOCAL) {
      const t = buildBrand(ctx, bid, new Date(d));
      if (t && t.length) tasks[bid] = t;
      if (isEventDay(ctx, bid, d)) eventBrands.push(bid);
    }
    if (Object.keys(tasks).length) {
      days.push({ date: new Date(d), tasks, eventBrands, week: weekLabelFor(ctx.START, d) });
    }
  }
  return days;
}
