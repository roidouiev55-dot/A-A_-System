export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { validate, ValidationError } from "../../../lib/validate";
import { NextResponse } from "next/server";

export async function PUT(req) {
  try {
    const { id, sent } = validate.reminder(await req.json());
    if (sent) {
      const { error } = await getSupabase().from("reminders_sent").upsert({ id, sent_at: new Date().toISOString() });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const { error } = await getSupabase().from("reminders_sent").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 422 });
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
