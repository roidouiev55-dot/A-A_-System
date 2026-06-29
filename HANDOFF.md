# HANDOFF — מצב המערכת

עדכון אחרון: יוני 2026, אחרי סבב תיקונים מקיף. לפרטי עבודה והנחיות → ראה **CLAUDE.md**.

## מה זו המערכת
ניהול שיווק לחברת הפקת אירועים **A&A HAFAKOT**. **Next.js 14** (App Router) + **React 18**, **Supabase** (DB), **Gemini** (יצירת הודעות ווטסאפ). עברית RTL, פריסה ב-Vercel.
4 הפקות (WN/MX/BG/WB), 7 טאבים (דשבורד · אירועים · סושיאל · הודעות · מאגר · תזכורות · הפקות).

## מצב נוכחי — יציב
כל ממצאי האבטחה והבאגים המעשיים (🔴/🟡) טופלו. המערכת בפרודקשן ב-Vercel, `main` מעודכן.

### ארכיטקטורה
- **Frontend:** `app/AppShell.jsx` (shell — tabs, טעינת data, `mutate`, toast) + `app/tabs/*.jsx` (7 טאבים). עוזרים: `app/api-client.js`, `app/shared.js`.
- **API:** `app/api/*/route.js`. כולם `force-dynamic`, מאומתים ב-`middleware.js`, מאמתים קלט ב-`lib/validate.js`.
- **Logic:** `lib/core.js` (מותגים, תאריכים, חוקי תזכורות), `lib/socialplan.js` (תוכנית תוכן), `lib/prompts.js` (פרומפט Gemini), `lib/auth.js`, `lib/supabase.js`.

### אבטחה
- שער סיסמה משותפת (`APP_PASSWORD`) + session cookie httpOnly חתום ב-`AUTH_SECRET` (**חובה** — fail-closed אם חסר).
- `middleware.js` חוסם כל `/api/*` (חוץ מ-`/api/auth`) ב-401. `LoginGate` נשען על 401 אמיתי מ-`/api/data`.
- כל קלט עובר whitelist+טיפוסים; שדות URL חייבים `http(s)://`. security headers ב-`next.config.js`.

### באג פתוח ידוע + הקלה
- **`messages` — supabase-js מחזיר 0 שורות על SELECT** (בלי שגיאה), בעוד שאר הטבלאות ו-INSERT תקינים. **הקלה:** `app/api/data/route.js` קורא הודעות דרך **PostgREST REST ישיר** (`directMessages()`). שורש לא ידוע. אם חוזר על טבלה אחרת — אותו דפוס.

## מה תוקן בסבב הזה (לפי קטגוריות)
- **אבטחה:** אימות API + middleware + ולידציה; `AUTH_SECRET` חובה (S1); השוואת סיסמה ללא דליפת אורך (S4); השהיית login כושל (S2); security headers (M5); `.gitignore` נגד דליפת מפתחות (M1).
- **באגים:** עדכונים אופטימיים עם rollback (`mutate`); תאריכי ישראל (`toDateInput`/`dateInputToISO`); דילוג על אירוע עם תאריך לא תקין (B3); `req.json()` עטוף (B1); קריאת messages דרך REST ישיר (7→2→0); מחיקת event/community דרך query-param; אימות מחיקה (`.select()`).
- **חוויית משתמש:** toast לשגיאות; Gemini עם timeout+retry, `thinkingBudget:0`, `maxOutputTokens:2000`.
- **תחזוקה:** פיצול `AppShell` ל-`tabs/`; ריכוז צבעים ב-`BRANDS[].glow`; הסרת קוד מת; `.env.example` (M3).
- **תוכן:** פרומפט ווטסאפ חדש (קצר, מובנה, כוכביות גלויות); חוקי תזכורות (מייל 21/7, SMS 17/10/3).

## ⚠️ פעולות שדורשות את Roi
1. **M2 — lockfile:** להריץ `npm install` בשורש מקומית ולדחוף `package-lock.json` (אין Node בסביבת Claude Code).
2. **B2 — מחיקת הודעות:** לוודא בפרודקשן שמחיקת הודעה אכן עובדת. אם מופיע toast שגיאה למרות שהשורה נמחקת — זו אנומליית ה-supabase-js; להחיל את דפוס ה-REST הישיר גם על delete/update.
3. **ENV ב-Vercel:** לוודא ש-`AUTH_SECRET` מוגדר (אחרת fail-closed = 500), ושכל המשתנים ב-`.env.example` קיימים.

## נדחה / לעתיד (לא דחוף)
B4, S3, P2, P3, Q1–Q5 — קוסמטיים/ארכיטקטוניים בערך נמוך. M4 — tests. ראה הרשימה המלאה בהיסטוריית הסקירה.

## משתני סביבה (Vercel)
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (service_role!), `GEMINI_API_KEY`, `APP_PASSWORD`, `AUTH_SECRET`.
