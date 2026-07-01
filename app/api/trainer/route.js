export const dynamic = "force-dynamic";
export const maxDuration = 30; // room for Gemini timeout + retries
import { getSupabase } from "../../../lib/supabase";
import { BRAND_BIBLE, CONTENT_TYPES, GENERAL_PRINCIPLES } from "../../../lib/brandbible";
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
function buildTrainerPrompt(brandId, feedbacks) {
  const b = BRAND_BIBLE[brandId];
  const principles = GENERAL_PRINCIPLES.map(p => `- ${p}`).join("\n");
  const types = CONTENT_TYPES.map(t => `- ${t.label}: ${t.desc}`).join("\n");
  const brandBlock = [
    `שם: ${b.name}`,
    `פרופיל: ${b.profile}`,
    b.event ? `מועד/מועדים: ${b.event}` : "",
    b.area ? `אזור: ${b.area}` : "",
    b.vibe ? `וויב: ${b.vibe}` : "",
    b.menu ? `תפריט: ${b.menu}` : "",
    b.codes ? `קודים וקהילה: ${b.codes}` : "",
    b.avoid?.length ? `מילים/ביטויים אסורים: ${b.avoid.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const learn = feedbacks.length
    ? "\n\nלמידה מפידבק קודם על ההפקה הזו (כוון את הסגנון בהתאם — חזק על מה שאושר, הימנע ממה שנדחה):\n" +
      feedbacks.map((f, i) =>
        `${i + 1}. [${f.decision === "approved" ? "אושר ✅" : "נדחה ❌"}] סוג: ${f.content_type || "?"}` +
        `${f.note ? ` · הערת המשתמש: ${f.note}` : ""}\n"""${(f.suggestion || "").slice(0, 400)}"""`
      ).join("\n")
    : "";

  return `אתה כותב תוכן סטוריז לאינסטגרם עבור הפקת האירועים "${b.name}" של חברת A&A HAFAKOT. אתה חבר בקהילה שיודע — לא מותג שמכריז.

עקרונות ברזל לכל סטורי:
${principles}

סוגי התוכן האפשריים — בחר את המתאים ביותר להפקה ולרגע הנוכחי:
${types}

הידע על ההפקה:
${brandBlock}${learn}

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

    // pull the last 10 feedbacks for this brand so the model learns from them
    const { data: fb } = await getSupabase()
      .from("content_feedback")
      .select("content_type,suggestion,decision,note")
      .eq("brand", brand)
      .order("created_at", { ascending: false })
      .limit(10);

    const prompt = buildTrainerPrompt(brand, fb || []);
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
