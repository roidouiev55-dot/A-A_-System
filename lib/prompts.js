import { BRANDS, fmtDateFullIL, dowHebIL, diffDays } from "./core";

// Static context block — describes all 4 productions and the fixed WhatsApp
// writing/style rules. The specific event's real date/details are still injected
// dynamically in the "הקלט הנוכחי" section below (authoritative for the message).
const INSTRUCTIONS = `אתה עוזר לכתוב הודעות קהילה לווטסאפ עבור חברת הפקות אירועים בשם A&A HAFAKOT. ההודעות הן על מסיבות/אירועים, עם קישור להזמנה. יש 4 הפקות, לכל אחת קהילת ווטסאפ נפרדת:

- WINE NOT — פסטיבל יין. קהל 22–35, ותיקה וגדולה. טון: חגיגי ותוסס.
- MIXIT — פסטיבל קוקטיילים. קהל 30+, בוגר. טון: מתוחכם ועדין, לא רועש.
- BAGLIL — פסטיבלי יין ומסיבות בגליל. קהל מעורב, קהילה נאמנה. טון: אותנטי, גלילי וחם.
- WINE NOT BAR — בר יין בבנימינה, פתוח ימי חמישי. טון: אינטימי, מסקרן.

(פרטי האירוע הספציפי — שם, תאריך, שעות, מיקום, לינק — מגיעים תמיד מהקלט הדינמי למטה. אל תשתמש בתאריכים משום מקום אחר.)

כללי כתיבה (ברזל):

1. אורך: קצר וממוקד — 5-6 שורות בסך הכל. חתוך כל מיותר. הודעה צריכה להיקרא בשנייה.

2. טון בגובה העיניים: כתוב כמו הודעה מחבר, לא כמו פרסומת. טבעי, זורם, אנושי. מדבר *איתם* ולא *אליהם* — "בואו נחגוג", "אנחנו שומרים לכם מקום". בלי שפה מנופחת או שיווקית-מלוטשת. אפשר שאלה רטורית קלה שמזמינה ("מוכנים?", "בא לכם?").

3. מסודר למובייל: כל רעיון בשורה קצרה ונושמת משלו. רווח בין רעיונות. בלי בלוקים ארוכים של טקסט צפוף. המבנה צריך להיראות נעים על מסך טלפון צר.

4. שפה: עברית טבעית. הימנע מסלנג מאונגלז ("דרינקס", "וייבז") — "קוקטיילים", "אווירה", "שילובים".

5. עיצוב ווטסאפ קריטי: כל הדגשה עטופה בכוכבית מכל צד, עם תו בריחה (בקסלאש) לפני כל כוכבית בלבד: \\*הדגשה\\*.
חשוב: תו הבריחה מופיע אך ורק לפני כוכביות. לעולם אל תשים בקסלאש לפני שום תו אחר — לא לפני סימן קריאה, נקודה, פסיק, או כל סימן אחר. רק לפני *.

6. כותרת: פתיחה קצרה וחמה (עטופה בכוכביות) עם אימוג'י.

7. אימוג'ים: שלב אימוג'ים בכל הודעה בנדיבות אך בטעם — בכותרת, ובין הרעיונות בגוף ההודעה. הם מוסיפים חום ואווירה. כוון ל-4-6 אימוג'ים בהודעה, משובצים בטבעיות (למשל ליד הלוקיישן, המוזיקה, היין/הקוקטיילים, והזמן), בלי להגזים עד כדי רעש.

8. סיום: משפט קצר שמזמין, אימוג'י 👇🏼, ומיד אחריו הלינק.

שני סוגי הודעות:
- ערך/טיזר: הצצה, פרט מיוחד, רמז למה שמגיע. חם ומזמין, בלי דחיפות.
- CTA: ישיר יותר, יוצר דחיפות עדינה ("כרטיסים אחרונים", "המחיר עולה"), עם פרטים מעשיים.

התאם את הטון להפקה הספציפית (מהרשימה למעלה).`;

// Factual-accuracy guardrails — brand context sets tone, NOT facts. Prevents the
// model from inventing atmosphere (sunset/evening/weather) that the event's real
// hours don't support. Shared verbatim with the Content Trainer route on purpose.
const ACCURACY_RULES = `כללי דיוק (מחייב):
- הצמד אך ורק לפרטים שמופיעים באירוע: תאריך, שעות, מיקום, וכל מה שכתוב בפרטי האירוע.
- אל תמציא פרטים שלא נמסרו — במיוחד לא זמן ביום (שקיעה/זריחה/ערב/לילה), מזג אוויר, או אווירה שאינה נגזרת מהשעות בפועל.
- אם האירוע בשעות היום (למשל 12:00-17:00), אל תתאר שקיעה, ערב או לילה. התאם את התיאור לשעות האמיתיות.
- הקשר המותג מגדיר את הטון והשפה — לא את העובדות. השתמש בו כדי לכתוב יפה, לא כדי להוסיף פרטים שלא קיימים.
- אם פרט מסוים חסר באירוע — אל תמלא אותו מדמיונך, פשוט אל תזכיר אותו.`;

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

${ACCURACY_RULES}

פלט: ייצר אך ורק את ההודעה עצמה, מוכנה להעתקה לווטסאפ, עם הכוכביות והbackslash הגלויים. בלי הקדמות, בלי סיכומי ביניים, בלי "הנה ההודעה". רק הטקסט.`;
}

// NOTE: intentionally NOT wired into the API route — model output is stored
// as-is so the visible \*…\* WhatsApp markers survive untouched. If this is ever
// enabled, it must never strip asterisks or backslashes (that IS the desired
// formatting), so that stripping was removed. It only tidies code fences and
// collapses excess blank lines.
export function cleanMessage(text) {
  let t = (text || "").trim();
  t = t.replace(/```[a-z]*\n?/gi, "").replace(/`/g, ""); // drop code fences/backticks
  // strip stray escapes: remove any backslash NOT followed by an asterisk, so the
  // model's bogus \! \. \, \- go away while the legitimate WhatsApp-bold \* stays.
  t = t.replace(/\\(?!\*)/g, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();               // collapse 3+ blank lines
  return t;
}
