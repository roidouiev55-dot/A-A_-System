export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [ev, comm, msg, cs, ba, rs] = await Promise.all([
      getSupabase().from("events").select("*").order("date"),
      getSupabase().from("communities").select("*").order("brand"),
      getSupabase().from("messages").select("*").order("created_at", { ascending: false }),
      getSupabase().from("content_status").select("*"),
      getSupabase().from("brand_assets").select("*"),
      getSupabase().from("reminders_sent").select("*"),
    ]);
    return NextResponse.json({
      events: ev.data || [],
      communities: comm.data || [],
      messages: msg.data || [],
      contentStatus: Object.fromEntries((cs.data || []).map(r => [r.id, r])),
      brandAssets: Object.fromEntries((ba.data || []).map(r => [r.brand, r])),
      remindersSent: Object.fromEntries((rs.data || []).map(r => [r.id, r])),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
