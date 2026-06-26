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
    const { id } = validate.eventUpdate(await req.json()); // reuse: requires valid id
    const { error } = await getSupabase().from("events").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) { return bad(e); }
}
