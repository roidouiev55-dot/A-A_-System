export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sb = getSupabase();
    console.log("[data] SERVICE_KEY prefix:", (process.env.SUPABASE_SERVICE_KEY || "MISSING").slice(0, 12));
    const [ev, comm, msg, cs, ba, rs, td] = await Promise.all([
      sb.from("events").select("*").order("date"),
      sb.from("communities").select("*").order("brand"),
      sb.from("messages").select("*").order("created_at", { ascending: false }),
      sb.from("content_status").select("*"),
      sb.from("brand_assets").select("*"),
      sb.from("reminders_sent").select("*"),
      sb.from("tasks_done").select("*"),
    ]);
    console.log("[data] messages count:", msg.data?.length, "error:", msg.error);
    return NextResponse.json({
      events: ev.data || [],
      communities: comm.data || [],
      messages: msg.data || [],
      contentStatus: Object.fromEntries((cs.data || []).map(r => [r.id, r])),
      brandAssets: Object.fromEntries((ba.data || []).map(r => [r.brand, r])),
      remindersSent: Object.fromEntries((rs.data || []).map(r => [r.id, r])),
      tasksDone: Object.fromEntries((td.data || []).map(r => [r.id, r])),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
