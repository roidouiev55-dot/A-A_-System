import { BRANDS, fmtDateFull, dowHeb, diffDays } from "./core";

// Static context block — describes all 4 productions and the fixed WhatsApp
// writing/style rules. Event-specific dates/details are injected dynamically
// in the "הקלט הנוכחי" section below, so the brand lines stay date-free.
const INSTRUCTIONS = `אתה עוזר לי לכתוב הודעות קהילה לווטסאפ עבור חברת הפקות אירועים בשם A&A HAFAKOT. יש לנו 4 הפקות, לכל אחת קהילת ווטסאפ נפרדת:

WINE NOT — פסטיבל יין. קהל 22–35, ותיקה וגדולה. טון: חגיגי ותוסס.
MIXIT — פסטיבל קוקטיילים. קהל 30+, בוגר. טון: מתוחכם ועדין, לא רועש.
BAGLIL — פסטיבלי יין ומסיבות בגליל. קהל מעורבב, קהילה נאמנה. טון: אותנטי, גלילי וחם.
WINE NOT BAR — בר יין חדש בבנימינה, פיילוט יולי בלבד, פתוח ימי חמישי. טון: אינטימי, מסקרן, סיפור פתיחה.

חוקי כתיבה וסגנון קבועים:
- עברית מלאה.
- עיצוב מיוחד לווטסאפ (חשוב מאוד): כל כותרת, תת-כותרת, או מילה שדורשת הדגשה חייבת להיות מוקפת בכוכבית אחת מכל צד (למשל: *הדגשה*). חובה להשתמש בתו הבריחה (backslash) לפני כל כוכבית כדי שהכוכביות יוצגו כטקסט פשוט ולא יהפכו לעיצוב Bold נסתר. המטרה: שהכוכביות יישארו גלויות ויעבדו כשהמשתמש מעתיק לווטסאפ.
- כותרת: כל הודעה נפתחת בכותרת קצרה (עטופה בכוכביות) עם אימוג'י רלוונטי בסופה.
- חובה לשלב עוד שני אימוג'ים רלוונטיים בתוך פסקאות הטקסט (בלי להגזים).
- חלוקה לפסקאות קצרות ואווריריות (שורה-שתיים) עם שורות ריקות ביניהן.
- טון: מקצועי אבל חם, כמו חבר שיודע על מה הוא מדבר.
- בלי "ברוכים הבאים", בלי "היי" גנרי. ישר ולעניין.
- סיום בקריאה לפעולה אלגנטית, אימוג'י 👇🏼 ומיד אחריו הקישור (אם יש).

שני סוגי הודעות:
- הודעה #1 — ערך/טיזר (אמצע שבוע): נותנת ערך — הצצה, פרט, סיפור קטן. מסיימת ברמיזה לאירוע, לא בקריאה ישירה לקנות.
- הודעה #2 — CTA (לקראת אירוע): פרטים מעשיים — מתי, איפה, לינק. דחיפות אלגנטית.

הקלט שתקבל כולל: שם ההפקה, סוג ההודעה (ערך/CTA), כמה זמן לפני האירוע, פרט מיוחד אם יש, ופרטי האירוע המלאים.`;

export function buildGeminiPrompt(event, msgType) {
  const brandName = BRANDS[event.brand]?.name || event.brand || "";
  const link = (event.link || "").trim();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysOut = diffDays(today, new Date(event.date));
  const isValue = msgType === "ערך";

  const detailsBlock = event.full_details && event.full_details.trim()
    ? `\nפרטים מלאים (השתמשי במידע הזה לציטוט lineup, הטבות, שעות וכו' — אל תמציאי פרטים):\n"""\n${event.full_details.trim()}\n"""`
    : "";

  return `${INSTRUCTIONS}

--- הקלט הנוכחי ---
ההפקה: ${brandName}
סוג ההודעה: ${isValue ? "#1 — ערך/טיזר (אמצע שבוע)" : "#2 — CTA (לקראת אירוע)"}
מועד: ${daysOut >= 0 ? `נותרו ${daysOut} ימים לאירוע` : "האירוע כבר עבר"}
שם האירוע: ${event.name || "לא צוין"}
תאריך: ${fmtDateFull(event.date)}, יום ${dowHeb(event.date)}
מיקום: ${event.location || "לא צוין"}
קישור: ${link || "אין קישור — אל תוסיפי קישור או מציין מקום לקישור"}${detailsBlock}

התשובה: רק ההודעה עצמה, מוכנה להעתקה לווטסאפ, עם הכוכביות הגלויות עם הbackslash. בלי הקדמה, בלי הסברים.`;
}

// NOTE: intentionally NOT wired into the API route — model output is stored
// as-is so the visible \*…\* WhatsApp markers survive untouched. If this is ever
// enabled, it must never strip asterisks or backslashes (that IS the desired
// formatting), so that stripping was removed. It only tidies code fences and
// collapses excess blank lines.
export function cleanMessage(text) {
  let t = (text || "").trim();
  t = t.replace(/```[a-z]*\n?/gi, "").replace(/`/g, ""); // drop code fences/backticks; keep * and \
  t = t.replace(/\n{3,}/g, "\n\n").trim();               // collapse 3+ blank lines
  return t;
}
