import { BRANDS, fmtDateFullIL, dowHebIL, diffDays } from "./core";

// Static context block — describes all 4 productions and the fixed WhatsApp
// writing/style rules. The specific event's real date/details are still injected
// dynamically in the "הקלט הנוכחי" section below (authoritative for the message).
const INSTRUCTIONS = `אתה עוזר לי לכתוב הודעות קהילה לווטסאפ עבור חברת הפקות אירועים בשם A&A HAFAKOT. יש לנו 4 הפקות, לכל אחת קהילת ווטסאפ נפרדת:

- WINE NOT — פסטיבל יין. קהל 22–35, ותיקה וגדולה. אירוע: 10/7. טון: חגיגי ותוסס.
- MIXIT — פסטיבל קוקטיילים. קהל 30+, בוגר. אירוע: 3/7. טון: מתוחכם ועדין, לא רועש.
- BAGLIL — פסטיבלי יין ומסיבות בגליל. קהל מעורבב, קהילה נאמנה. אירועים: 26/6, 10/7, 17/7. טון: אותנטי, גלילי וחם.
- WINE NOT BAR — בר יין חדש בבנימינה, פיילוט יולי בלבד, פתוח ימי חמישי. פתיחות: 2/7, 9/7, 16/7. טון: אינטימי, מסקרן, סיפור פתיחה.

חוקי כתיבה, אורך וסגנון (כללי ברזל):

1. תמצות ומיקוד: 3-4 פסקאות קצרות של שורה-שתיים לכל היותר. חלץ מהות (תאריך, מיקום, ליינאפ, אווירה).
2. שפה: עברית מלאה וטבעית. הימנע מסלנג מאונגלז ("דרינקס", "וייבז"). השתמש ב"קוקטיילים", "שילובים", "אווירה".
3. עיצוב ווטסאפ קריטי: כל הדגשה עטופה בכוכבית מכל צד, עם תו בריחה לפני כל כוכבית: \\*הדגשה\\*.
4. כותרת: פתיחה קצרה וחזקה (עטופה בכוכביות) עם אימוג'י בסוף.
5. אימוג'ים: עוד שני אימוג'ים רלוונטיים בפסקאות, ללא הגזמה.
6. טון: מקצועי וחם, ישר ולעניין. בלי "ברוכים הבאים" או "היי חברים".
7. סיום: משפט קצר אלגנטי, אימוג'י 👇🏼, אחריו [לינק להזמנה].

שני סוגי הודעות:
- ערך/טיזר: הצצה, פרט מיוחד, רמיזה למה שמגיע, בלי דחיפות.
- CTA: ישיר, דחיפות ("כרטיסים אחרונים", "המחיר עולה"), פרטים מעשיים.

קלט שתקבל:
- הפקה: [שם]
- סוג: [ערך / CTA]
- זמן/דחיפות: [שבוע לפני / כרטיסים אחרונים / וכו']
- פרט מיוחד: [אם יש]
- פרטי האירוע: [טקסט מלא]`;

export function buildGeminiPrompt(event, msgType) {
  const brandName = BRANDS[event.brand]?.name || event.brand || "";
  const link = (event.link || "").trim();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysOut = diffDays(today, new Date(event.date));
  const isValue = msgType === "ערך";

  const detailsBlock = event.full_details && event.full_details.trim()
    ? `\nפרטי האירוע: השתמש במידע הבא לציטוט lineup, הטבות, שעות וכו' — אל תמציא פרטים:\n"""\n${event.full_details.trim()}\n"""`
    : "\nפרטי האירוע: לא צוינו";

  return `${INSTRUCTIONS}

--- הקלט הנוכחי ---
הפקה: ${brandName}
סוג: ${isValue ? "ערך/טיזר" : "CTA"}
זמן/דחיפות: ${daysOut >= 0 ? `נותרו ${daysOut} ימים לאירוע` : "האירוע כבר עבר"}
שם האירוע: ${event.name || "לא צוין"}
תאריך: ${fmtDateFullIL(event.date)}, יום ${dowHebIL(event.date)}
מיקום: ${event.location || "לא צוין"}
קישור: ${link || "אין קישור — אל תוסיף לינק או מציין מקום ללינק"}${detailsBlock}

פלט: ייצר אך ורק את ההודעה עצמה, מוכנה להעתקה לווטסאפ, עם הכוכביות והbackslash הגלויים. בלי הקדמות, בלי סיכומי ביניים, בלי "הנה ההודעה". רק הטקסט.`;
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
