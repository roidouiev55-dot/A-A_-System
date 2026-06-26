export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { validate, ValidationError } from "../../../lib/validate";
import { NextResponse } from "next/server";

export async function PUT(req) {
  try {
    const { id, ...rest } = validate.contentStatus(await req.json());
    const updates = { ...rest, updated_at: new Date().toISOString() };
    const { data, error } = await getSupabase().from("content_status").upsert({ id, ...updates }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 422 });
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
