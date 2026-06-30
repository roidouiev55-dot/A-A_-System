export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { validate, ValidationError } from "../../../lib/validate";
import { NextResponse } from "next/server";

// Single shared row (id="main") holding the global asset-folder links.
export async function PUT(req) {
  try {
    const payload = validate.generalFolders(await req.json());
    const { data, error } = await getSupabase()
      .from("general_folders")
      .upsert(payload)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 422 });
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
