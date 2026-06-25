export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

export async function PUT(req) {
  const { id, done, label, brand } = await req.json();
  if (done) {
    const { error } = await getSupabase().from("tasks_done").upsert({ id, label: label||"", brand: brand||"", done_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    await getSupabase().from("tasks_done").delete().eq("id", id);
  }
  return NextResponse.json({ ok: true });
}
