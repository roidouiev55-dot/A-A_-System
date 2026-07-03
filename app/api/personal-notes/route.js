export const dynamic = "force-dynamic";
import { getSupabase } from "../../../lib/supabase";
import { validate, ValidationError } from "../../../lib/validate";
import { NextResponse } from "next/server";

// Single shared row (id="main") holding the dashboard personal note.
// If the personal_notes table hasn't been created yet, we surface a clear
// "migration missing" flag instead of a raw DB error so the widget can prompt
// the user to run db/personal_notes.sql rather than crashing.
export async function PUT(req) {
  try {
    const payload = validate.personalNote(await req.json());
    const updates = { ...payload, updated_at: new Date().toISOString() };
    const { data, error } = await getSupabase()
      .from("personal_notes")
      .upsert(updates)
      .select()
      .single();
    if (error) {
      const missing = /relation .*personal_notes.* does not exist|could not find the table/i.test(error.message || "");
      return NextResponse.json({ error: error.message, migrationMissing: missing }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 422 });
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
