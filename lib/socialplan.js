// Social content plan — 4 story days/week, weekly post, 2 community msgs/week,
// one countdown story per event. Content types: קומי / כרטיסים / סקר / אווירה.
import { addDays, sameDay, diffDays, fmtDate } from "./core";

let EVENTS = { WN: [], MX: [], BG: [], WB: [] };
let START = new Date(2026, 5, 18);
let END = new Date(2026, 6, 17);

function configure(events) {
  EVENTS = { WN: [], MX: [], BG: [], WB: [] };
  (events || []).forEach(ev => { if (EVENTS[ev.brand]) EVENTS[ev.brand].push(new Date(ev.date)); });
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
export function isEventDay(bid, d) { return EVENTS[bid].some(e => sameDay(e, d)); }

// brand-specific flavor for story content
const FLAVOR = {
  WN: { comi: "סטורי קומי — מם/טקסט קליל על יין או על 'מי שמגיע לפסטיבל'", vibe: "סטורי אווירה — קליפ/תמונה מפסטיבל קודם, אנרגיה" },
  MX: { comi: "סטורי קומי — בדיחת קוקטיילים / 'סוגי שתיינים'", vibe: "סטורי אווירה — קליפ מהבר, תאורה, קוקטייל בהילוך איטי" },
  BG: { comi: "סטורי קומי — הומור גלילי / 'שישי בצפון'", vibe: "סטורי אווירה — נוף גלילי, שקיעה, כוסות יין" },
  WB: { comi: "סטורי קומי — קליל על 'חמישי בבר' / חיי בנימינה", vibe: "סטורי אווירה — פינות הבר, יין נמזג, תאורה חמה" },
};

// 4 weekly story slots cycle through these types
function storyForSlot(bid, slot, dte) {
  const f = FLAVOR[bid];
  // near an event, bias toward tickets
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

  // event day → live coverage
  if (isEventDay(bid, d)) {
    tasks.push({ ch: "story", type: "סיקור לייב", flag: "urgent", title: "🎉 יום האירוע — סיקור לייב לאורך הערב (5-7 סטורי)" });
    tasks.push({ ch: "comm", type: "עדכון חי", flag: "urgent", title: "הודעת קהילה: 'אנחנו חיים! בואו' + לינק" });
    return tasks;
  }

  // recap post 2 days after
  if (EVENTS[bid].some(e => sameDay(addDays(e, 2), d))) {
    tasks.push({ ch: "post", type: "פוסט סקירת אירוע", flag: "key", title: "פוסט ריקאפ — קרוסלת תמונות מהאירוע + תודות" });
  }

  // countdown story — once per event, 2 days before
  if (dte === 2) {
    tasks.push({ ch: "story", type: "ספירה לאחור", flag: "key", title: "סטורי ספירה לאחור — 'עוד יומיים!' עם סטיקר countdown" });
  }

  // weekly rhythm: 4 story days (Sun, Tue, Wed, Thu) + post (Sun) + 2 community (Tue, Thu)
  if (wd === 0) { // Sunday
    tasks.push(dte <= 7 && dte > 0
      ? { ch: "post", type: "פוסט סקירת אירוע", flag: "key", title: `פוסט חשיפת אירוע — ${(()=>{const e=nextEvent(bid,d);return e?fmtDate(e):"";})()} (קרוסלה / ריל) + פתיחת מכירה` }
      : { ch: "post", type: "פוסט", title: "פוסט שבועי — קרוסלת תמונות / ריל אווירה" });
    tasks.push(storyForSlot(bid, 0, dte));
  }
  if (wd === 2) { // Tuesday
    tasks.push(storyForSlot(bid, 1, dte));
    tasks.push({ ch: "comm", type: "הודעת קהילה", title: "הודעת קהילה #1 — ערך/טיזר אמצע שבוע" });
  }
  if (wd === 3) { // Wednesday
    tasks.push(storyForSlot(bid, 2, dte));
  }
  if (wd === 4) { // Thursday
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
