export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

// Direct PostgREST read for messages, bypassing the supabase-js client. The
// client has been returning 0 rows for `messages` (with no error) while every
// other table loads fine — so we read messages over raw REST and fall back to
// it when the client comes back empty. Same service_role auth headers.
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
    return { status: r.status, rows, raw: body };
  } catch (e) {
    return { status: 0, rows: [], raw: String(e?.message || e) };
  }
}

export async function GET() {
  try {
    const sb = getSupabase();
    const [ev, comm, msg, cs, ba, rs, td, direct] = await Promise.all([
      sb.from("events").select("*").order("date"),
      sb.from("communities").select("*").order("brand"),
      sb.from("messages").select("*").order("created_at", { ascending: false }),
      sb.from("content_status").select("*"),
      sb.from("brand_assets").select("*"),
      sb.from("reminders_sent").select("*"),
      sb.from("tasks_done").select("*"),
      directMessages(),
    ]);

    const jsMessages = msg.data || [];
    // prefer the client result; fall back to the direct REST read when empty
    const messages = jsMessages.length ? jsMessages : direct.rows;

    // ── TEMP DIAGNOSTICS (remove once confirmed working) ──
    console.log("[data] SUPABASE_URL:", (process.env.SUPABASE_URL || "MISSING").slice(0, 30));
    console.log("[data] supabase-js messages:", jsMessages.length, "error:", msg.error?.message || null);
    console.log("[direct] status:", direct.status, "count:", direct.rows.length);
    console.log("[direct] body:", JSON.stringify(direct.raw).slice(0, 400));

    return NextResponse.json({
      events: ev.data || [],
      communities: comm.data || [],
      messages,
      contentStatus: Object.fromEntries((cs.data || []).map(r => [r.id, r])),
      brandAssets: Object.fromEntries((ba.data || []).map(r => [r.brand, r])),
      remindersSent: Object.fromEntries((rs.data || []).map(r => [r.id, r])),
      tasksDone: Object.fromEntries((td.data || []).map(r => [r.id, r])),
      _debug: {
        supabaseJsMessages: jsMessages.length,
        directStatus: direct.status,
        directMessages: direct.rows.length,
        urlPrefix: (process.env.SUPABASE_URL || "MISSING").slice(0, 30),
        source: jsMessages.length ? "supabase-js" : "direct-rest",
        messagesError: msg.error?.message || null,
        eventsReturned: (ev.data || []).length,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
