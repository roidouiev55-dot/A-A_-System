export const dynamic = "force-dynamic";
export const maxDuration = 30; // room for Gemini timeout + retries
import { getSupabase } from "../../../lib/supabase";
import { BRAND_BIBLE, CONTENT_TYPES, GENERAL_PRINCIPLES } from "../../../lib/brandbible";
import { fmtDateFull, dowHeb, diffDays } from "../../../lib/core";
import { validate, ValidationError } from "../../../lib/validate";
import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const GEMINI_TIMEOUT_MS = 12000;
const GEMINI_RETRIES = 2; // up to 3 attempts total

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function bad(e) {
  if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 422 });
  return NextResponse.json({ error: String(e) }, { status: 400 });
}

// Same Gemini pattern as messages/route.js: per-attempt timeout, retry on
// transient failures (network/abort/429/5xx/empty), fail fast on 4xx. Kept local
// so the Content Trainer route stays self-contained.
async function callGemini(prompt) {
  if (!GEMINI_KEY) throw new Error("מפתח Gemini לא מוגדר בשרת");
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.95, maxOutputTokens: 2000, thinkingConfig: { thinkingBudget: 0 } },
  });
  let lastErr = "Gemini: כשל לא ידוע";
  for (let attempt = 0; attempt <= GEMINI_RETRIES; attempt++) {
    if (attempt > 0) await sleep(400 * attempt);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
        body: payload,
        signal: ctrl.signal,
      });
    } catch (e) {
      lastErr = e?.name === "AbortError" ? "Gemini: הקריאה ארכה מדי (timeout)" : "Gemini: שגיאת רשת";
      continue;
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) {
      const data = await res.json().catch(() => null);
      const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      if (text) return text;
      lastErr = "לא התקבל טקסט מהמודל";
      continue;
    }

    const errBody = await res.text().catch(() => "");
    if (res.status === 429 || res.status >= 500) { lastErr = `Gemini ${res.status}: ${errBody}`; continue; }
    throw new Error(`Gemini ${res.status}: ${errBody}`);
  }
  throw new Error(lastErr);
}

// Build the story-suggestion prompt from the brand bible + recent feedback so the
// model learns from what was previously approved/rejected for this production.
// `ctx` carries the current date and the nearest upcoming event so the model
// never proposes content tied to a season/holiday/event that has already passed.
function buildTrainerPrompt(brandId, feedbacks, ctx = {}) {
  const b = BRAND_BIBLE[brandId];
  const principles = GENERAL_PRINCIPLES.map(p => `- ${p}`).join("\n");
  const types = CONTENT_TYPES.map(t => `- ${t.label}: ${t.desc}`).join("\n");
  const brandBlock = [
    `שם: ${b.name}`,
    b.voice ? `קול (Voice): ${b.voice}` : "",
    b.tone ? `טון (Tone): ${b.tone}` : "",
    b.vocabulary?.length ? `אוצר מילים וביטויי מפתח: ${b.vocabulary.join(" · ")}` : "",
    b.signature ? `סלוגן/חתימה: ${b.signature}` : "",
    b.formula ? `מבנה מנצח למסר: ${b.formula}` : "",
    b.emojis ? `שימוש באימוג'ים: ${b.emojis}` : "",
    b.length ? `אורך: ${b.length}` : "",
    b.winning ? `מה שעובד (winning): ${b.winning}` : "",
    b.watchout ? `להיזהר מ: ${b.watchout}` : "",
  ].filter(Boolean).join("\n");

  const learn = feedbacks.length
    ? "\n\nלמידה מפידבק קודם על ההפקה הזו (כוון את הסגנון בהתאם — חזק על מה שאושר, הימנע ממה שנדחה):\n" +
      feedbacks.map((f, i) =>
        `${i + 1}. [${f.decision === "approved" ? "אושר ✅" : "נדחה ❌"}] סוג: ${f.content_type || "?"}` +
        `${f.note ? ` · הערת המשתמש: ${f.note}` : ""}\n"""${(f.suggestion || "").slice(0, 400)}"""`
      ).join("\n")
    : "";

  const timeBlock = [
    ctx.todayStr ? `התאריך היום: ${ctx.todayStr}.` : "",
    ctx.event
      ? `האירוע הקרוב של ${b.name}: "${ctx.event.name}"${ctx.eventDateStr ? ` בתאריך ${ctx.eventDateStr}` : ""}${ctx.event.location ? `, ${ctx.event.location}` : ""}${ctx.daysOut != null ? ` (בעוד ${ctx.daysOut} ימים)` : ""}.`
      : `אין כרגע אירוע קרוב מתוזמן ל${b.name} — התמקד בתוכן קהילה/אווירה כללי, בלי לרמז על אירוע ספציפי.`,
    "הנחיית זמן קריטית: הצע תוכן שרלוונטי אך ורק לתאריך הנוכחי, לאירוע הקרוב ולעונה הנוכחית. אל תציע תוכן שקשור לחגים, מועדים או אירועים שכבר עברו.",
  ].filter(Boolean).join("\n");

  return `אתה כותב תוכן סטוריז לאינסטגרם עבור הפקת האירועים "${b.name}" של חברת A&A HAFAKOT. אתה חבר בקהילה שיודע — לא מותג שמכריז.

עקרונות ברזל לכל סטורי:
${principles}

סוגי התוכן האפשריים — בחר את המתאים ביותר להפקה ולרגע הנוכחי:
${types}

הידע על ההפקה:
${brandBlock}${learn}

מודעות לזמן (מחייב):
${timeBlock}

המשימה: הצע סטורי אחד בלבד — יצירתי, אקטואלי ומדויק להפקה. לא גנרי, המשך שיחה ולא הכרזה. עברית בלבד.

החזר בדיוק במבנה הבא, כל שדה בשורה נפרדת, בלי הקדמות ובלי סיכום:
סוג תוכן: <בחר אחד מהרשימה, בעברית>
טקסט הסטורי: <הטקסט שיופיע על הסטורי — קצר, קולע, אימוג'י בסוף שורה>
רעיון ויזואלי: <תיאור קצר של מה רואים בסטורי>
אלמנט אינטראקטיבי: <סקר / שאלה / סטיקר אם רלוונטי, אחרת "אין">
הערה על לינק: <האם לצרף לינק כרטיסים + חץ 👇🏼, או "בלי לינק">`;
}

export async function POST(req) {
  let parsed;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין" }, { status: 400 });
  }
  const { action, ...body } = parsed || {};

  if (action === "generate") {
    let brand;
    try { brand = validate.trainerBrand(body); } catch (e) { return bad(e); }

    // pull the last 10 feedbacks for this brand (learning) + the nearest upcoming
    // event (time-awareness) so the model never proposes past/holiday content.
    const sb = getSupabase();
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const [fbRes, evRes] = await Promise.all([
      sb.from("content_feedback")
        .select("content_type,suggestion,decision,note")
        .eq("brand", brand)
        .order("created_at", { ascending: false })
        .limit(10),
      sb.from("events")
        .select("name,date,location")
        .eq("brand", brand)
        .gte("date", todayStart.toISOString())
        .order("date", { ascending: true })
        .limit(1),
    ]);
    const fb = fbRes.data;
    const nextEv = evRes.data && evRes.data[0];
    const ctx = {
      todayStr: `${fmtDateFull(now)}, יום ${dowHeb(now)}`,
      event: nextEv || null,
      eventDateStr: nextEv ? `${fmtDateFull(nextEv.date)}, יום ${dowHeb(nextEv.date)}` : "",
      daysOut: nextEv ? diffDays(todayStart, new Date(nextEv.date)) : null,
    };

    const prompt = buildTrainerPrompt(brand, fb || [], ctx);
    try {
      const text = await callGemini(prompt);
      const m = text.match(/סוג תוכן:\s*(.+)/);
      const content_type = m ? m[1].trim().slice(0, 100) : "";
      return NextResponse.json({ suggestion: text, content_type, brand });
    } catch (e) {
      return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
    }
  }

  if (action === "feedback") {
    let payload;
    try { payload = validate.trainerFeedback(body); } catch (e) { return bad(e); }

    // created_at set explicitly: the prompt-learning query orders by it, so a null
    // would mis-sort a just-saved feedback after a refresh.
    const sb = getSupabase();
    const { data: saved, error } = await sb
      .from("content_feedback")
      .insert({ ...payload, created_at: new Date().toISOString() })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { count } = await sb.from("content_feedback").select("*", { count: "exact", head: true });
    return NextResponse.json({ ok: true, feedback: saved, count: count ?? null });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
