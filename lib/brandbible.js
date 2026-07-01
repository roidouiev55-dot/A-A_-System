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

// Per-production knowledge. Optional fields (menu/codes/area) are only present
// where they matter — the prompt builder skips whatever is missing.
export const BRAND_BIBLE = {
  WN: {
    name: "WINE NOT",
    profile: "פסטיבל יין ותיק, קהל 22-35, טון חגיגי-תוסס לא צעקני.",
    event: "10.7",
    area: "אזור קיסריה + מרכז + סביבה.",
    vibe: "יין, ים, שקיעה, קהל אנרגטי, קיץ בוגר. מסלולי יין = נושא שהקהל מעריך.",
    avoid: ["פסטיבל היין המדובר", "אירוע מטורף"],
  },
  MX: {
    name: "MIXIT",
    profile: "פסטיבל קוקטיילים, קהל 30+ מתוחכם, טון עדין יוקרתי לא רועש.",
    event: "3.7",
    area: "לוקיישנים לצד הים (קיסריה, חוף כרמל, עתלית).",
    vibe: "קוקטיילים אסתטיים, צהריים של קיץ, SUMMER VIBES. פסטיבל של יום ולא של לילה.",
    menu: "Passion Colada, Lychee Elder Gin, Basil Smash Twist, Berry Vodka Sour, Golden Bloom, Strawberry Banana, Cosmo Lychee — קוקטיילים ללא הגבלה.",
    avoid: ["המסיבה של הקיץ", "בואו לחגוג", "סימני קריאה מרובים"],
  },
  BG: {
    name: "BAGLIL",
    profile: "פסטיבלי יין ומסיבות בגליל, קהל צעיר 20+, קהילה גלילית-צפונית בלבד. טון אותנטי-גלילי-חם, פחות מיתוגי ויותר בית.",
    event: "10.7, 17.7",
    vibe: "שקיעה גלילית, יקבים, טבע, קהל צוחק.",
    codes: '"מי שהיה יודע" = קוד קהילה. "הסבב הבא" = מטבע לשון. ריקאפ אחרי אירוע חשוב.',
    avoid: [],
  },
  WB: {
    name: "WINE NOT BAR",
    profile: "בר יין בבנימינה, פיילוט יולי, קהל 20+ ובעיקר 25+, אינטימי-אלגנטי-מסקרן. במצב launch/היכרות.",
    event: "פתיחה 2.7, ואז ימי חמישי 9.7, 16.7",
    vibe: "Rooftop = הוויב המרכזי (הבר נפתח ב-20:00, השקיעה לא מרכזית).",
    codes: '"הליין שלנו עולה לגג" = קוד. "כניסה חופשית מותנית ברישום" = פרט חשוב.',
    avoid: ["בר יין חדש", "אל תפספסו"],
  },
};
