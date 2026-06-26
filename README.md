# A&A HAFAKOT · מערכת ניהול

## Environment Variables (Vercel)
| שם | ערך |
|---|---|
| `SUPABASE_URL` | `https://[PROJECT_ID].supabase.co` |
| `SUPABASE_SERVICE_KEY` | Secret key מ-Supabase |
| `GEMINI_API_KEY` | מפתח Gemini API |
| `APP_PASSWORD` | **סיסמת הכניסה למערכת** (חובה — בלי זה אי אפשר להתחבר) |
| `AUTH_SECRET` | מחרוזת אקראית ארוכה לחתימת ה-session (מומלץ; יש ברירת מחדל) |

## אבטחה
- כל גישה ל-API מוגנת ב-`middleware.js`: בלי session תקין מוחזר `401`.
- הכניסה היא בסיסמה משותפת (`APP_PASSWORD`). לאחר התחברות נשמר cookie מסוג `httpOnly` ל-30 יום.
- **אם `APP_PASSWORD` לא מוגדר — המערכת נכשלת סגור (fail closed): אי אפשר להתחבר.** הגדר אותו לפני שימוש.
- כל קלט ל-API עובר ולידציה ו-whitelist של שדות (`lib/validate.js`); שדות קישור חייבים להתחיל ב-`http(s)://`.
