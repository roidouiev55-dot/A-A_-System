export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

// Page through a table so a low PostgREST "max-rows" / range cap can't silently
// truncate the result. We advance by the number of rows actually returned and
// stop only when a page comes back empty — so even a cap of 2 yields every row.
async function selectAll(sb, table, order) {
  const PAGE = 1000;
  let all = [];
  let from = 0;
  for (let i = 0; i < 100; i++) { // safety bound: 100 pages
    let q = sb.from(table).select("*");
    if (order) q = q.order(order.column, { ascending: order.ascending });
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) return { data: all, error };
    all = all.concat(data || []);
    if (!data || data.length === 0) break;
    from += data.length;
  }
  return { data: all, error: null };
}

export async function GET() {
  try {
    const sb = getSupabase();
    const [ev, comm, msg, cs, ba, rs, td] = await Promise.all([
      sb.from("events").select("*").order("date"),
      sb.from("communities").select("*").order("brand"),
      selectAll(sb, "messages", { column: "created_at", ascending: false }),
      sb.from("content_status").select("*"),
      sb.from("brand_assets").select("*"),
      sb.from("reminders_sent").select("*"),
      sb.from("tasks_done").select("*"),
    ]);
    return NextResponse.json({
      events: ev.data || [],
      communities: comm.data || [],
      messages: msg.data || [],
      contentStatus: Object.fromEntries((cs.data || []).map(r => [r.id, r])),
      brandAssets: Object.fromEntries((ba.data || []).map(r => [r.brand, r])),
      remindersSent: Object.fromEntries((rs.data || []).map(r => [r.id, r])),
      tasksDone: Object.fromEntries((td.data || []).map(r => [r.id, r])),
      // TEMP: lets us confirm in the browser whether all messages now load
      // (paginated) vs the previous 2. Remove once the 7->2 issue is confirmed.
      _debug: {
        messagesReturned: (msg.data || []).length,
        eventsReturned: (ev.data || []).length,
        messagesError: msg.error?.message || null,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
