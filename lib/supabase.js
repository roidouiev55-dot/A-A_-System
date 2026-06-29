import { createClient } from "@supabase/supabase-js";

let _client = null;

// Server-side Supabase client. Uses the SUPABASE_SERVICE_KEY (service_role) only
// — there is NO fallback to an anon key. persistSession/autoRefreshToken are off
// because there's no browser session to persist in a serverless handler.
export function getSupabase() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url) throw new Error("Missing SUPABASE_URL env var");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_KEY env var");
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return _client;
}
