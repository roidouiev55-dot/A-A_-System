export const dynamic = "force-dynamic";
export const maxDuration = 30; // allow room for Gemini timeout + retries
import { getSupabase } from "../../../lib/supabase";
import { buildGeminiPrompt, cleanMessage } from "../../../lib/prompts";
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

// Call Gemini with a per-attempt timeout and retry on transient failures
// (network/abort/429/5xx/empty). Non-retryable client errors (bad key, bad
// request) fail fast. Returns the generated text or throws.
async function callGemini(prompt) {
  if (!GEMINI_KEY) throw new Error("מפתח Gemini לא מוגדר בשרת");
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.85, maxOutputTokens: 2000, thinkingConfig: { thinkingBudget: 0 } },
  });
  let lastErr = "Gemini: כשל לא ידוע";
  for (let attempt = 0; attempt <= GEMINI_RETRIES; attempt++) {
    if (attempt > 0) await sleep(400 * attempt); // linear backoff
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
      continue; // network / abort → retry
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) {
      const data = await res.json().catch(() => null);
      const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      if (text) return text;
      lastErr = "לא התקבל טקסט מהמודל";
      continue; // empty response → retry
    }

    const errBody = await res.text().catch(() => "");
    if (res.status === 429 || res.status >= 500) { lastErr = `Gemini ${res.status}: ${errBody}`; continue; }
    throw new Error(`Gemini ${res.status}: ${errBody}`); // 4xx → fail fast
  }
  throw new Error(lastErr);
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
    let event, msgType;
    try {
      event = validate.messageEvent(body.event);
      msgType = validate.msgType(body.msgType);
    } catch (e) { return bad(e); }

    const prompt = buildGeminiPrompt(event, msgType);
    try {
      const text = cleanMessage(await callGemini(prompt));

      // set created_at explicitly: GET /api/data orders messages by it, so a
      // null value would mis-sort or hide a freshly generated message after a refresh.
      const { data: saved, error } = await getSupabase()
        .from("messages")
        .insert({ event_id: event.id, brand: event.brand, msg_type: msgType, body: text, status: "לא נשלח", created_at: new Date().toISOString() })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      if (!saved) return NextResponse.json({ error: "ההודעה לא נשמרה ב-Supabase" }, { status: 500 });
      return NextResponse.json({ message: saved });
    } catch (e) {
      return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
    }
  }

  if (action === "updateStatus") {
    try {
      const id = String(body.id || "").slice(0, 200);
      if (!id) throw new ValidationError("מזהה (id) חסר");
      const status = validate.msgStatus(body.status);
      const { data, error } = await getSupabase().from("messages").update({ status }).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data);
    } catch (e) { return bad(e); }
  }

  if (action === "delete") {
    // id arrives in the POST body (apiPost), which is reliable — unlike DELETE
    // bodies — so transport matches what the handler reads. We add .select() to
    // confirm a row was actually removed instead of returning a false "ok".
    const id = String(body.id || "").slice(0, 200);
    if (!id) return NextResponse.json({ error: "מזהה (id) חסר" }, { status: 422 });
    const { data, error } = await getSupabase().from("messages").delete().eq("id", id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "ההודעה לא נמחקה — לא נמצאה שורה תואמת (id לא תקין או חוסר הרשאת כתיבה)" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, deleted: data.length });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
