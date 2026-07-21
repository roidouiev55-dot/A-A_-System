// Social content plan — derived from events, computed forward from today until a
// week and a half after each event.
//
// Brands in the plan: WINE NOT (WN), MIXIT (MX), BAGLIL (BG). WINE NOT BAR (WB)
// is intentionally excluded.
//
// Per-EVENT, not per-brand: every event generates its own complete, independent
// set of tasks (community, stories, poll, WN post, run-up, reels, carousel), and
// each task is tagged with the event it belongs to (evName / evDate / evKey). If
// one brand has two nearby events, each gets the full rule-set and the results
// ACCUMULATE — no merge, no cap, no dilution. Two events sharing a day are two
// separate tasks, never treated as a duplicate.
//
// Rhythm (per event):
//  • Community messages — every week in the window: Tuesday + Saturday-evening
//    (motzash). The event week adds a 3rd: the day before the event ("מחר!").
//  • Vibe stories (אווירה + קישור) — 3 per regular week. The event's own event
//    week replaces these with 4 spread before the event; one carries a countdown
//    sticker, one is the day-before "מחר נתראה".
//  • Poll story (סטורי סקר) — once every two weeks (Monday).
//  • Square-graphic post — WN only, on the Sunday that opens the event week.
//  • After the event, within a week and a half: reels first, then a carousel post.
//
// Story weekday rule: vibe/poll/countdown stories may only land Sunday–Thursday.
// If a computed date falls on Friday or Saturday it is shifted back to the nearest
// valid weekday (Thursday), and further back if that day already holds the SAME
// event's story — never doubling one event on a single day. The ONE exception is
// the "day before the event" story: it always lands the day before the event,
// even on Friday or Saturday. Community messages are unaffected — motzash (Sat
// evening) stays a valid community day.
//
// All state lives in a per-call context — there is no module-level mutable state,
// so a result never depends on the order or timing of previous calls.
import { addDays, diffDays, toDateInput } from "./core";

const PLAN_BRANDS = ["WN", "MX", "BG"]; // WB dropped from the plan

function startOfDay(d) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function weekSunday(d) { const r = startOfDay(d); r.setDate(r.getDate() - r.getDay()); return r; }
function weekIndexFrom(anchorSun, d) { return Math.floor(diffDays(anchorSun, weekSunday(d)) / 7); }
function isStoryWeekend(d) { const g = d.getDay(); return g === 5 || g === 6; } // Fri / Sat

function configure(events) {
  const byBrand = {}; PLAN_BRANDS.forEach(b => (byBrand[b] = []));
  (events || []).forEach(ev => {
    if (!byBrand[ev.brand]) return;
    const date = startOfDay(ev.date);
    if (isNaN(date.getTime())) return; // skip invalid dates instead of poisoning the plan
    byBrand[ev.brand].push({ date, name: ev.name || "", key: ev.id || toDateInput(date) });
  });
  Object.values(byBrand).forEach(a => a.sort((x, y) => x.date - y.date));

  const today = startOfDay(new Date());
  const evDates = PLAN_BRANDS.flatMap(b => byBrand[b].map(e => e.date)).sort((a, b) => a - b);
  const START = today;
  let END = evDates.length ? addDays(evDates[evDates.length - 1], 11) : addDays(today, 28);
  if (END < addDays(today, 21)) END = addDays(today, 21); // always show a few weeks ahead
  return { byBrand, START, END };
}

// Each returned day carries everything the UI needs — its tasks (keyed by brand,
// each tagged with its owning event), the brands with an event that day
// (`eventBrands`), and its week label — so consumers never call back into this
// module with hidden shared state.
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

  // Add a task, always tagged with its owning event. Never dedupes across events —
  // tasks from different events on the same day are kept separately.
  const add = (date, bid, ev, task) => {
    if (!inRange(date)) return;
    const slot = ensure(date);
    (slot.tasks[bid] = slot.tasks[bid] || []).push({ ...task, evName: ev.name, evDate: toDateInput(ev.date), evKey: ev.key });
  };

  // Does THIS event already have a story on this day for this brand? (per-event —
  // a different event's story on the same day is not a conflict.)
  const eventHasStory = (date, bid, evKey) => {
    if (!inRange(date)) return false;
    const slot = map.get(toDateInput(date));
    return !!slot && (slot.tasks[bid] || []).some(t => t.ch === "story" && t.evKey === evKey);
  };

  // Add a story under the weekday rule: pull it off Fri/Sat (and off any day that
  // already holds the same event's story) back toward Thursday.
  const addStory = (date, bid, ev, task) => {
    let d = startOfDay(date);
    while ((isStoryWeekend(d) || eventHasStory(d, bid, ev.key)) && d >= START) d = addDays(d, -1);
    add(d, bid, ev, task);
  };

  for (const bid of PLAN_BRANDS) {
    // ── event-relative tasks (built first so week-relative stories can dedupe) ──
    for (const ev of byBrand[bid]) {
      const e = ev.date;
      // square-graphic post — WN only, on the Sunday opening the event week
      if (bid === "WN") add(weekSunday(e), bid, ev, { ch: "post", type: "פוסט", flag: "key", title: "פוסט גרפיקת ריבוע + טקסט קצר" });
      // run-up vibe stories (weekday-restricted → Sun–Thu)
      addStory(addDays(e, -6), bid, ev, { ch: "story", type: "סטורי אווירה", title: "סטורי אווירה + קישור" });
      addStory(addDays(e, -4), bid, ev, { ch: "story", type: "סטורי אווירה", title: "סטורי אווירה + קישור" });
      addStory(addDays(e, -2), bid, ev, { ch: "story", type: "סטורי אווירה", flag: "key", title: "סטורי אווירה + קישור · סטיקר ספירה לאחור ⏳" });
      // day-before story — ALWAYS the day before, even on Fri/Sat (the one exception)
      add(addDays(e, -1), bid, ev, { ch: "story", type: "סטורי אווירה", flag: "key", title: "סטורי אווירה + קישור · 'מחר נתראה'" });
      // extra day-before community message
      add(addDays(e, -1), bid, ev, { ch: "comm", type: "הודעת קהילה", flag: "urgent", title: "הודעת קהילה — 'מחר!' פרטים אחרונים + לינק" });
      // after the event, within a week and a half: reels first, then carousel
      add(addDays(e, 3), bid, ev, { ch: "post", type: "רילס", flag: "key", title: "רילס מהאירוע — הראשון 🎬" });
      add(addDays(e, 6), bid, ev, { ch: "post", type: "פוסט קרוסלה", title: "פוסט קרוסלה — תמונות מהאירוע" });
    }

    // ── week-relative rhythm, run independently per event over its own window ──
    for (const ev of byBrand[bid]) {
      const eventWeekSun = +weekSunday(ev.date);
      const windowEnd = addDays(ev.date, 11); // the event's own week-and-a-half tail
      for (let sw = new Date(anchorSun); sw <= END && sw <= windowEnd; sw = addDays(sw, 7)) {
        // community: Tuesday + Saturday-evening (motzash) — every week in the window
        add(addDays(sw, 2), bid, ev, { ch: "comm", type: "הודעת קהילה", title: "הודעת קהילה — יום שלישי" });
        add(addDays(sw, 6), bid, ev, { ch: "comm", type: "הודעת קהילה", title: 'הודעת קהילה — מוצ"ש (שבת בערב)' });
        // poll story every two weeks (Monday)
        if (weekIndexFrom(anchorSun, sw) % 2 === 0) addStory(addDays(sw, 1), bid, ev, { ch: "story", type: "סטורי סקר", title: "סטורי סקר — שאלה אינטראקטיבית לקהל" });
        // 3 regular vibe stories — only on this event's NON-event weeks (its event
        // week already carries the 4 run-up stories above)
        if (+sw !== eventWeekSun) {
          [0, 3, 5].forEach(wd => addStory(addDays(sw, wd), bid, ev, { ch: "story", type: "סטורי אווירה", title: "סטורי אווירה + קישור" }));
        }
      }
    }
  }

  // mark event days (used for the 🎉 marker / event styling)
  for (const bid of PLAN_BRANDS) {
    for (const ev of byBrand[bid]) {
      if (!inRange(ev.date)) continue;
      const slot = ensure(ev.date);
      if (!slot.eventBrands.includes(bid)) slot.eventBrands.push(bid);
    }
  }

  return [...map.values()].sort((a, b) => a.date - b.date);
}
