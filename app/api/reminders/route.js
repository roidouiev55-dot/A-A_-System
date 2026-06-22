export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

export async function PUT(req) {
  const { id, sent } = await req.json();
  if (sent) {
    const { error } = await getSupabase().from("reminders_sent").upsert({ id, sent_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    await getSupabase().from("reminders_sent").delete().eq("id", id);
  }
  return NextResponse.json({ ok: true });
}
