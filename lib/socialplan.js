// Social content plan — derived from events, computed forward from today until a
// week and a half after each event.
//
// Brands in the plan: WINE NOT (WN), MIXIT (MX), BAGLIL (BG). WINE NOT BAR (WB)
// is intentionally excluded.
//
// Rhythm (per brand):
//  • Community messages — every week: Tuesday + Saturday-evening (motzash).
//    Event week adds a 3rd: the day before the event ("מחר!").
//  • Vibe stories (אווירה + קישור) — 3 per regular week (Sun/Wed/Fri).
//    Event week replaces these with 4 spread before the event; one carries a
//    countdown sticker, one is the day-before "מחר נתראה".
//  • Poll story (סטורי סקר) — once every two weeks (Monday).
//  • Square-graphic post — WN only, on the Sunday that opens the event week.
//  • After the event, within a week and a half: reels first, then a carousel post.
//
// All state lives in a per-call context — there is no module-level mutable state,
// so a result never depends on the order or timing of previous calls.
import { addDays, diffDays, toDateInput } from "./core";

const PLAN_BRANDS = ["WN", "MX", "BG"]; // WB dropped from the plan

function startOfDay(d) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function weekSunday(d) { const r = startOfDay(d); r.setDate(r.getDate() - r.getDay()); return r; }
function weekIndexFrom(anchorSun, d) { return Math.floor(diffDays(anchorSun, weekSunday(d)) / 7); }

function configure(events) {
  const byBrand = {}; PLAN_BRANDS.forEach(b => (byBrand[b] = []));
  (events || []).forEach(ev => { if (byBrand[ev.brand]) byBrand[ev.brand].push(startOfDay(ev.date)); });
  Object.values(byBrand).forEach(a => a.sort((x, y) => x - y));

  const today = startOfDay(new Date());
  const evDates = PLAN_BRANDS.flatMap(b => byBrand[b]).sort((a, b) => a - b);
  const START = today;
  let END = evDates.length ? addDays(evDates[evDates.length - 1], 11) : addDays(today, 28);
  if (END < addDays(today, 21)) END = addDays(today, 21); // always show a few weeks ahead
  return { byBrand, START, END };
}

// Each returned day carries everything the UI needs — its tasks (keyed by brand),
// the brands with an event that day (`eventBrands`), and its week label — so
// consumers never call back into this module with hidden shared state.
export function buildAllDays(events) {
  const { byBrand, START, END } = configure(events);
  const anchorSun = weekSunday(START);
  const map = new Map(); // dateKey → { date, tasks:{bid:[…]}, eventBrands:[], week }

  const ensure = (date) => {
    const key = toDateInput(date);
    if (!map.has(key)) {
      const d = startOfDay(date);
      map.set(key, { date: d, tasks: {}, eventBrands: [], week: `שבוע ${weekIndexFrom(anchorSun, d) + 1}` });
    }
    return map.get(key);
  };
  const inRange = (date) => date >= START && date <= END;
  const add = (date, bid, task) => {
    if (!inRange(date)) return;
    const slot = ensure(date);
    (slot.tasks[bid] = slot.tasks[bid] || []).push(task);
  };
  const hasStory = (date, bid) => {
    if (!inRange(date)) return false;
    const slot = map.get(toDateInput(date));
    return !!slot && (slot.tasks[bid] || []).some(t => t.ch === "story");
  };

  for (const bid of PLAN_BRANDS) {
    const evs = byBrand[bid];
    const eventWeeks = new Set(evs.map(e => +weekSunday(e)));

    // ── event-relative tasks (built first so week-relative stories can dedupe) ──
    for (const ev of evs) {
      // square-graphic post — WN only, on the Sunday opening the event week
      if (bid === "WN") add(weekSunday(ev), bid, { ch: "post", type: "פוסט", flag: "key", title: "פוסט גרפיקת ריבוע + טקסט קצר" });
      // 4 vibe stories spread across the run-up to the event
      add(addDays(ev, -6), bid, { ch: "story", type: "סטורי אווירה", title: "סטורי אווירה + קישור" });
      add(addDays(ev, -4), bid, { ch: "story", type: "סטורי אווירה", title: "סטורי אווירה + קישור" });
      add(addDays(ev, -2), bid, { ch: "story", type: "סטורי אווירה", flag: "key", title: "סטורי אווירה + קישור · סטיקר ספירה לאחור ⏳" });
      add(addDays(ev, -1), bid, { ch: "story", type: "סטורי אווירה", flag: "key", title: "סטורי אווירה + קישור · 'מחר נתראה'" });
      // extra day-before community message
      add(addDays(ev, -1), bid, { ch: "comm", type: "הודעת קהילה", flag: "urgent", title: "הודעת קהילה — 'מחר!' פרטים אחרונים + לינק" });
      // after the event, within a week and a half: reels first, then carousel
      add(addDays(ev, 3), bid, { ch: "post", type: "רילס", flag: "key", title: "רילס מהאירוע — הראשון 🎬" });
      add(addDays(ev, 6), bid, { ch: "post", type: "פוסט קרוסלה", title: "פוסט קרוסלה — תמונות מהאירוע" });
    }

    // ── week-relative rhythm ──
    for (let sw = new Date(anchorSun); sw <= END; sw = addDays(sw, 7)) {
      const isEventWeek = eventWeeks.has(+sw);
      // community: Tuesday + Saturday-evening (motzash) — every week
      add(addDays(sw, 2), bid, { ch: "comm", type: "הודעת קהילה", title: "הודעת קהילה — יום שלישי" });
      add(addDays(sw, 6), bid, { ch: "comm", type: "הודעת קהילה", title: 'הודעת קהילה — מוצ"ש (שבת בערב)' });
      // poll story every two weeks (Monday)
      if (weekIndexFrom(anchorSun, sw) % 2 === 0) add(addDays(sw, 1), bid, { ch: "story", type: "סטורי סקר", title: "סטורי סקר — שאלה אינטראקטיבית לקהל" });
      // 3 regular vibe stories in non-event weeks (skip days that already hold a story)
      if (!isEventWeek) {
        [0, 3, 5].forEach(wd => {
          const date = addDays(sw, wd);
          if (!hasStory(date, bid)) add(date, bid, { ch: "story", type: "סטורי אווירה", title: "סטורי אווירה + קישור" });
        });
      }
    }
  }

  // mark event days (used for the 🎉 marker / event styling)
  for (const bid of PLAN_BRANDS) {
    for (const ev of byBrand[bid]) {
      if (!inRange(ev)) continue;
      const slot = ensure(ev);
      if (!slot.eventBrands.includes(bid)) slot.eventBrands.push(bid);
    }
  }

  return [...map.values()].sort((a, b) => a.date - b.date);
}
