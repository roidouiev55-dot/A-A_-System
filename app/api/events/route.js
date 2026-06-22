export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req) {
  const body = await req.json();
  const { data, error } = await getSupabase().from("events").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PUT(req) {
  const body = await req.json();
  const { id, ...rest } = body;
  const { data, error } = await getSupabase().from("events").update(rest).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req) {
  const { id } = await req.json();
  const { error } = await getSupabase().from("events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
