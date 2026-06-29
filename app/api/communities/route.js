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
    const payload = validate.communityCreate(await req.json());
    const { data, error } = await getSupabase().from("communities").insert(payload).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) { return bad(e); }
}

export async function PUT(req) {
  try {
    const { id, ...rest } = validate.communityUpdate(await req.json());
    const { data, error } = await getSupabase().from("communities").update(rest).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) { return bad(e); }
}

export async function DELETE(req) {
  try {
    // id comes via query string (?id=) to match apiDel — DELETE bodies are
    // unreliable. Fall back to the JSON body for backwards compatibility.
    let raw = new URL(req.url).searchParams.get("id");
    if (!raw) { const b = await req.json().catch(() => ({})); raw = b?.id; }
    const id = validate.id(raw);
    const { error } = await getSupabase().from("communities").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) { return bad(e); }
}
