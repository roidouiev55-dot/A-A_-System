export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { validate, ValidationError } from "../../../lib/validate";
import { NextResponse } from "next/server";

function bad(e) {
  if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 422 });
  return NextResponse.json({ error: String(e) }, { status: 400 });
}

export async function POST(req) {
  try {
    const payload = validate.eventCreate(await req.json());
    const { data, error } = await getSupabase().from("events").insert(payload).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) { return bad(e); }
}

export async function PUT(req) {
  try {
    const { id, ...rest } = validate.eventUpdate(await req.json());
    const { data, error } = await getSupabase().from("events").update(rest).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) { return bad(e); }
}

export async function DELETE(req) {
  try {
    // id arrives in the query string (?id=). DELETE request bodies are unreliable
    // — proxies/CDNs can strip them, leaving req.json() empty so the id never
    // reaches the handler. Fall back to the JSON body for backwards compatibility.
    let raw = new URL(req.url).searchParams.get("id");
    if (!raw) { const b = await req.json().catch(() => ({})); raw = b?.id; }
    const id = validate.id(raw);

    // .select() so we can confirm a row was actually removed.
    const { data, error } = await getSupabase().from("events").delete().eq("id", id).select();

    // ── TEMP DIAGNOSTICS — log the full Supabase response (revert once root-caused) ──
    console.error("[DELETE /api/events] receivedId:", id);
    console.error("[DELETE /api/events] data:", JSON.stringify(data));
    console.error("[DELETE /api/events] error:", error ? {
      code: error.code, message: error.message, details: error.details, hint: error.hint,
    } : null);
    console.error("[DELETE /api/events] rawError:", error);

    // TEMP: surface the real Supabase error instead of a generic message
    if (error) {
      return NextResponse.json(
        { stage: "supabase-error", receivedId: id, code: error.code, message: error.message, details: error.details, hint: error.hint },
        { status: 500 },
      );
    }
    // TEMP: 0 rows deleted with NO db error → return the actual (empty) response so
    // the network/log shows it's a "no row matched / RLS-blocked" case, not a crash.
    if (!data || data.length === 0) {
      return NextResponse.json(
        { stage: "no-rows-deleted", receivedId: id, data, note: "Supabase returned no error but deleted 0 rows" },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, deleted: data.length });
  } catch (e) {
    console.error("[DELETE /api/events] threw:", e);
    return bad(e);
  }
}
