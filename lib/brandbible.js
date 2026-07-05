// Content "bible" — the knowledge base the Content Trainer feeds into the Gemini
// prompt. Pure data, no logic. Kept separate from prompts.js so the story-training
// knowledge can grow independently of the WhatsApp-message prompt.

// Iron rules that apply to every story, for every production.
export const GENERAL_PRINCIPLES = [
  'קול: חבר שיודע, לא מותג. בלי "היי", בלי "ברוכים הבאים", בלי הכרזות רשמיות.',
  "לא מכריזים על אירוע שכבר באוויר כאילו הוא חדש — ההתייחסות היא המשך שיחה.",
  "טקסט קצר (2-4 שורות), משפט ראשון תופס, אימוג'י בסוף שורה.",
  "CTA רק כשיש לינק כרטיסים: חץ 👇🏼 + סטיקר לינק.",
  'לא תיוגים בסטורי — "שלחו לחבר" עובד יותר טוב.',
  "יצירתיות גבוהה, אקטואליות, אינטראקציה, שמירה על הקהילה.",
];

// The content types the model may choose from. `key` is the stable id, `label`
// is what appears in the suggestion, `desc` guides the model.
export const CONTENT_TYPES = [
  { key: "atmosphere_image", label: "תמונת אווירה", desc: "תמונת אווירה (עם/בלי לינק)" },
  { key: "atmosphere_video", label: "סרטון אווירה", desc: "סרטון קצר מאירוע (קהל רוקד / DJ / ברמן מוזג) עם/בלי לינק" },
  { key: "meme", label: "מם / קומי", desc: "תוכן קומי / מם אקטואלי עם טוויסט למסיבות שלנו" },
  { key: "ai_image", label: "תמונת AI", desc: "תמונת AI שנוצרת כשמתאים" },
  { key: "poll", label: "סקר", desc: "סקר עם 2 אפשרויות ברורות + אימוג'י" },
  { key: "countdown", label: "ספירה לאחור", desc: "ספירה לאחור לאירוע" },
];

// Per-production knowledge, distilled from analysing each production's real
// Instagram presence. Describes identity, voice and what wins — NOT dates.
// The specific event's real date/details come from the DB `event`, never here.
// Optional fields are only present where they matter — buildTrainerPrompt skips
// whatever is missing.
export const BRAND_BIBLE = {
  WN: {
    name: "WINE NOT",
    voice: "קהילה חברתית-חמה של אנשים יפים סביב יין איכותי, מוזיקה טובה ונופים מרהיבים — עם תחושת מועדון בלעדי",
    tone: "חברי-קליל עם נגיעה של יוקרתיות בוטיק. דיוק בבחירת מילים (מוזיקה מדויקת, לוקיישן מנצח)",
    vocabulary: ["כמיטב המסורת", "מוזיקה מדויקת", "לוקיישן מנצח/מדהים", "ווינוטים יקרים", "¿WineNot?"],
    signature: "MUSIC • WINE • LOVE",
    formula: "הוק רגשי → ההבטחה המשולשת (יין ללא הגבלה כמיטב המסורת + מוזיקה מדויקת + לוקיישן מנצח) → פרטים טכניים → דחיפות/CTA",
    emojis: "🍷 קבוע + אימוג'י לוקיישן ספציפי (🌊 ים, 🏛️ קיסריה, 🌇 גג, 🎭 פורים)",
    winning: "אפטרמוביז עם טקסט גרפי גדול, שאלות ישירות (אדום/לבן), היילייטס SOLD OUT",
  },
  MX: {
    name: "MIXIT",
    voice: "מסיבת חוף/גג קיצית וקלילה שמדברת לקהל כמו חבר טוב, עם קוקטיילים בלי הגבלה ואווירה קסומה",
    tone: "קליל-חברי, חם ואינטימי, לא יוקרתי-קר. פנייה ישירה כמו לחברים",
    vocabulary: ["קוקטיילים ללא הגבלה", "הקהל הכי מדויק/מיוחד שיש", "אווירה קסומה/מטורפת", "Your Spirit, Our Mix"],
    formula: "הצהרה נלהבת/הוק רגשי → קוקטיילים ללא הגבלה + אווירה קסומה → פרטים → CTA",
    emojis: "🍸 קבוע + ❤️ 😍 🌞 🏖️ 🎟️ 🔥",
    length: "קצר עד בינוני, אף פעם לא ארוך-מספרי",
    winning: "שיתופי פעולה/ריפוסטים (פי 10-20 מעורבות), תמונות קהל אמיתיות",
    watchout: "דלף המרה — לענות מהר לבקשות 'פרטים' עם לינק",
  },
  BG: {
    name: "BAGLIL",
    voice: "חבר-מפיק אנרגטי שמזמין אישית למסיבת יין כפרית אקסקלוסיבית-אך-נגישה, ומתגאה שמביא תרבות לצפון",
    tone: "קליל-חברי מובהק, טון של חבר שמזמין למסיבה. כמו סטטוס אישי, לא הודעת שיווק",
    vocabulary: ["בגליל/בצפון/בגולן", "סוף סוף משהו לצפון", "יש רמה בצפון", "X מגיע לגליל", "כרטיסים בביו", "המחירים עולים", "נתראה ברחבה"],
    formula: "הכרזה ישירה '[שם אמן] מגיע לגליל 🌳' → תיאור לוקיישן כפרי + חוויה → תאריך+מיקום → דחיפות + כרטיסים בביו",
    emojis: "🍷 יין, 🎭 פורים, 🎟️ כרטיסים, 📅📍 לוגיסטיקה, ❤️🌜🦋 רגשי. תמיד בסוף משפט",
    length: "שבועי קצר-חד; אירועי דגל 5-6 שורות עם אימוג'ים מפרקים",
    winning: "שם אמן מוכר + תיוג (פי 5-10), פורמט וידאו, זהות מקומית רגשית > תיאור טכני",
    watchout: "הודעות מכירה בלי רגש/שם → מעורבות נמוכה. לחבר תמיד לרגש או שם אמן",
  },
  WB: {
    name: "WINE NOT BAR",
    voice: "בר יין בוטיקי ואינטימי שמוכר תחושה ואווירה, במינימום מילים ומקסימום ויזואל",
    tone: "שני מצבים: אירועי = פורמלי-חם מכובד (אנחנו גאים להזמין). שוטף = מינימליסטי, מראה אל תספר",
    vocabulary: ["אווירה (מילת מפתח)", "יין אוכל ומוזיקה", "Sky Wine Bar", "טיזר-סוד 🤫"],
    formula: "(אירועי) כותרת+אימוג'י → הזמנה מכובדת → 📅 תאריך 📍 מיקום → CTA כפול (קפשן+ויזואל) → 'המקומות מוגבלים'",
    emojis: "מדוד: 🍷 מסגור, 😋 אוכל, 🤫 סוד, 📅📍👆 פונקציונלי",
    length: "אירועי = פסקה מסודרת; שוטף = משפט קצר או אימוג'ים, אבל אף פעם לא אפס טקסט",
    winning: "טקסט רגשי-קצר מנצח שקט (פי 2-3), הכפלת CTA, אחידות ויזואלית שחור-זהב",
  },
};
