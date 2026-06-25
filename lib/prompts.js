import { BRANDS, fmtDateFull, dowHeb, diffDays } from "./core";

const PROFILES = {
  WN: "WINE NOT — פסטיבל יין ותיק וגדול. קהל 22–35. טון: חגיגי, תוסס, מזמין.",
  MX: "MIXIT — פסטיבל קוקטיילים. קהל 30+ בוגר ומתוחכם. טון: עדין, אלגנטי, לא רועש.",
  BG: "BAGLIL — פסטיבלי יין ומסיבות בגליל. קהל מעורבב ונאמן. טון: אותנטי, גלילי, חם ומחבר.",
  WB: "WINE NOT BAR — בר יין בבנימינה, פיילוט, ימי חמישי. טון: אינטימי, מסקרן, סיפור פתיחה.",
};

export function buildGeminiPrompt(event, msgType) {
  const profile = PROFILES[event.brand] || "";
  const link = event.link || "";
  const today = new Date(); today.setHours(0,0,0,0);
  const daysOut = diffDays(today, new Date(event.date));
  const isValue = msgType === "ערך";

  const goal = isValue
    ? "הודעת ערך/טיזר שנשלחת מוקדם (כשרחוקים מהאירוע). המטרה: לחמם ולסקרן. תני הצצה או פרט מעניין, סיימי ברמיזה למה שמגיע. בלי קריאה אגרסיבית לקנות."
    : "הודעת CTA שנשלחת קרוב לאירוע. המטרה: להניע לפעולה. כתבי את הפרטים המעשיים (תאריך, מקום) וקראי לפעולה בסוף. דחיפות אלגנטית.";

  const linkLine = link
    ? `סיימי בשורת קריאה לפעולה, אחריה האימוג'י 👇🏼 ואז בשורה נפרדת הקישור: ${link}`
    : `סיימי בקריאה לפעולה. אין קישור — אל תכתבי קישור או מציין מקום לקישור.`;

  const detailsBlock = event.full_details && event.full_details.trim()
    ? `\nפרטים מלאים על האירוע (השתמשי במידע הזה כדי לכתוב הודעה מדויקת ועשירה — ציטוט שמות אמנים, הטבות, שעות וכו'):\n"""\n${event.full_details.trim()}\n"""\n`
    : "";

  return `כתבי הודעת וואטסאפ אחת בעברית עבור קהילת לקוחות של הפקת אירועים.

על ההפקה: ${profile}

פרטי האירוע (השתמשי רק במידע הזה, אל תמציאי פרטים):
שם: ${event.name}
תאריך: ${fmtDateFull(event.date)}, יום ${dowHeb(event.date)}
מיקום: ${event.location || "לא צוין"}
${daysOut >= 0 ? `נותרו ${daysOut} ימים לאירוע` : "האירוע כבר עבר"}
${detailsBlock}
סוג ההודעה: ${goal}

כללי כתיבה מחייבים:
1. עברית בלבד. אסור בהחלט להשתמש באנגלית או במילים לועזיות (חוץ משם ההפקה אם הוא באנגלית).
2. כתבי טקסט נקי בלבד. אסור להשתמש בסימני עיצוב כמו כוכביות, סולמיות, מקפים כפולים או markdown. שום ** או ## או __.
3. פתיחה בכותרת קצרה עם אימוג'י אחד מתאים בסופה.
4. פסקאות קצרות (שורה-שתיים) עם שורה ריקה ביניהן. חם ומזמין, לא רובוטי.
5. ${linkLine}

חשוב מאוד: כתבי אך ורק את ההודעה הסופית עצמה, מוכנה להעתקה. בלי הקדמה, בלי הסבר, בלי הערות, בלי לחזור על ההנחיות, בלי טקסט באנגלית. רק ההודעה.`;
}

// Clean model output: strip markdown artifacts, stray latin runs, leftover instructions
export function cleanMessage(text) {
  let t = (text || "").trim();
  // remove markdown bold/italic/heading markers
  t = t.replace(/\*\*/g, "").replace(/(^|\s)#{1,6}\s/g, "$1").replace(/__/g, "").replace(/\*/g, "");
  // remove code fences/backticks
  t = t.replace(/```[a-z]*\n?/gi, "").replace(/`/g, "");
  // drop lines that are mostly latin/english (model leakage), keep lines with the ticket link
  t = t.split("\n").filter(line => {
    const l = line.trim();
    if (!l) return true;
    if (/^https?:\/\//i.test(l)) return true; // keep links
    const hebrew = (l.match(/[\u0590-\u05FF]/g) || []).length;
    const latin = (l.match(/[A-Za-z]/g) || []).length;
    // if a line is mostly english with no hebrew, drop it
    if (hebrew === 0 && latin > 3) return false;
    return true;
  }).join("\n");
  // collapse 3+ blank lines
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return t;
}
