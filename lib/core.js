export const BRANDS = {
  WN: { id: "WN", name: "WINE NOT", bg: "#F4CCCC", text: "#7B0000", type: "פסטיבל יין" },
  MX: { id: "MX", name: "MIXIT", bg: "#D0E8E4", text: "#0B5E57", type: "פסטיבל קוקטיילים" },
  BG: { id: "BG", name: "BAGLIL", bg: "#D9EAD3", text: "#2D6117", type: "פסטיבלי יין ומסיבות בגליל" },
  WB: { id: "WB", name: "WINE NOT BAR", bg: "#E4D5F0", text: "#5B2D9E", type: "בר יין · בנימינה" },
};
export const BLIST = ["WN", "MX", "BG", "WB"];
export const HEB_DAYS = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
export const HEB_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

export function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
export function sameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
export function diffDays(a, b) { return Math.round((new Date(b) - new Date(a)) / 864e5); }
export function fmtDate(d) { const x = new Date(d); return `${String(x.getDate()).padStart(2,"0")}/${String(x.getMonth()+1).padStart(2,"0")}`; }
export function fmtDateFull(d) { const x = new Date(d); return `${String(x.getDate()).padStart(2,"0")}/${String(x.getMonth()+1).padStart(2,"0")}/${x.getFullYear()}`; }
export function fmtDateHeb(d) { const x = new Date(d); return `${x.getDate()} ב${HEB_MONTHS[x.getMonth()]}`; }
export function dowHeb(d) { return HEB_DAYS[new Date(d).getDay()]; }
export function todayStr() { return new Date().toISOString().slice(0, 10); }

export const REMINDER_RULES = [
  { offset: 14, channel: "email", label: "מייל חשיפה — האירוע נפתח למכירה" },
  { offset: 7, channel: "email", label: "מייל תזכורת — הכרטיסים בתנופה" },
  { offset: 3, channel: "sms", label: "SMS תזכורת — עוד 3 ימים" },
  { offset: 1, channel: "sms", label: "SMS — מחר! פרטים אחרונים" },
  { offset: 0, channel: "sms", label: "SMS — היום האירוע!" },
];
export const BAR_REMINDER_RULES = [
  { offset: 3, channel: "email", label: "מייל — חמישי הקרוב בבר" },
  { offset: 1, channel: "sms", label: "SMS — מחר ערב בבר" },
  { offset: 0, channel: "sms", label: "SMS — הערב פתוחים!" },
];

export function buildReminders(events) {
  const out = [];
  (events || []).forEach(ev => {
    const rules = ev.brand === "WB" ? BAR_REMINDER_RULES : REMINDER_RULES;
    rules.forEach(rule => {
      const sd = addDays(new Date(ev.date), -rule.offset);
      out.push({
        id: `${ev.id}_${rule.channel}_${rule.offset}`,
        eventId: ev.id, brand: ev.brand, eventName: ev.name,
        eventDate: ev.date, sendDate: sd.toISOString(),
        channel: rule.channel, label: rule.label, offset: rule.offset,
      });
    });
  });
  out.sort((a, b) => new Date(a.sendDate) - new Date(b.sendDate));
  return out;
}
