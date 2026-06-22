export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

export async function PUT(req) {
  const { id, status, canva_link } = await req.json();
  const updates = {};
  if (status !== undefined) updates.status = status;
  if (canva_link !== undefined) updates.canva_link = canva_link;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await getSupabase().from("content_status").upsert({ id, ...updates }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
