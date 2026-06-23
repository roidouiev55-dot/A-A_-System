export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { buildGeminiPrompt } from "../../../lib/prompts";
import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export async function POST(req) {
  const { action, ...body } = await req.json();

  if (action === "generate") {
    const { event, msgType } = body;
    const prompt = buildGeminiPrompt(event, msgType || "ערך");
    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: 1024 },
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: "Gemini: " + err }, { status: 500 });
      }
      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      if (!text) return NextResponse.json({ error: "לא התקבל טקסט מהמודל" }, { status: 500 });

      const { data: saved, error } = await getSupabase()
        .from("messages")
        .insert({ event_id: event.id, brand: event.brand, msg_type: msgType || "ערך", body: text, status: "לא נשלח" })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ message: saved });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }

  if (action === "updateStatus") {
    const { id, status } = body;
    const { data, error } = await getSupabase().from("messages").update({ status }).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  if (action === "delete") {
    const { id } = body;
    const { error } = await getSupabase().from("messages").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
