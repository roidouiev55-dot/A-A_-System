export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

// Direct PostgREST read for messages: the supabase-js client returns 0 rows for
// this table (with no error) while every other table loads fine and inserts
// succeed. We read messages exclusively over raw REST with the same service_role
// auth — the supabase-js messages query was dropped since it always came back
// empty (it was a redundant second fetch every load). See CLAUDE.md "ידע על באגים פתוחים".
async function directMessages() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_KEY || "";
  try {
    const r = await fetch(`${url}/rest/v1/messages?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    const body = await r.json().catch(() => null);
    const rows = Array.isArray(body) ? body : [];
    rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return rows;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const sb = getSupabase();
    const [ev, comm, cs, ba, rs, td, messages] = await Promise.all([
      sb.from("events").select("*").order("date"),
      sb.from("communities").select("*").order("brand"),
      sb.from("content_status").select("*"),
      sb.from("brand_assets").select("*"),
      sb.from("reminders_sent").select("*"),
      sb.from("tasks_done").select("*"),
      directMessages(),
    ]);

    return NextResponse.json({
      events: ev.data || [],
      communities: comm.data || [],
      messages,
      contentStatus: Object.fromEntries((cs.data || []).map(r => [r.id, r])),
      brandAssets: Object.fromEntries((ba.data || []).map(r => [r.brand, r])),
      remindersSent: Object.fromEntries((rs.data || []).map(r => [r.id, r])),
      tasksDone: Object.fromEntries((td.data || []).map(r => [r.id, r])),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
