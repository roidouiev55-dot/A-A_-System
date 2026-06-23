export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { NextResponse } from "next/server";

export async function PUT(req) {
  const { brand, ...rest } = await req.json();
  const { data, error } = await getSupabase()
    .from("brand_assets")
    .upsert({ brand, ...rest })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
