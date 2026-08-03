import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "medical-uploads";

let cachedClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service role key. Never import this
 * from a Client Component — the service role key bypasses row-level security.
 *
 * Lazily initialized so the app can still build/boot without Supabase
 * credentials configured yet; it only throws once Storage is actually used.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use Supabase Storage."
    );
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
