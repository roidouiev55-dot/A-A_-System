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

    // .select() so we can confirm a row was actually removed — a delete that
    // matches nothing otherwise returns "ok" while the row survives.
    const { data, error } = await getSupabase().from("events").delete().eq("id", id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "האירוע לא נמחק — ייתכן שכבר נמחק או שאין הרשאת כתיבה ל-Supabase" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, deleted: data.length });
  } catch (e) { return bad(e); }
}
