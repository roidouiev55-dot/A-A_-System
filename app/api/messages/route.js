export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { buildGeminiPrompt } from "../../../lib/prompts";
import { NextResponse } from "next/server";

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(req) {
  const { action, ...body } = await req.json();

  // Generate messages via Gemini
  if (action === "generate") {
    const { event } = body;
    const prompt = buildGeminiPrompt(event);

    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: "Gemini error: " + err }, { status: 500 });
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Parse the two messages
      const parts = text.split(/═{3,}[^═]*═{3,}/g).filter(p => p.trim());
      const msg1 = parts[0]?.trim() || text;
      const msg2 = parts[1]?.trim() || "";

      // Save both to DB
      const inserts = [];
      if (msg1) inserts.push({ event_id: event.id, brand: event.brand, msg_type: "ערך/טיזר", body: msg1, status: "לא נשלח" });
      if (msg2) inserts.push({ event_id: event.id, brand: event.brand, msg_type: "CTA", body: msg2, status: "לא נשלח" });

      if (inserts.length) {
        const { data: saved, error } = await getSupabase().from("messages").insert(inserts).select();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ messages: saved });
      }

      return NextResponse.json({ messages: [], raw: text });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }

  // Update message status
  if (action === "updateStatus") {
    const { id, status } = body;
    const { data, error } = await getSupabase().from("messages").update({ status }).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  // Delete message
  if (action === "delete") {
    const { id } = body;
    const { error } = await getSupabase().from("messages").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
