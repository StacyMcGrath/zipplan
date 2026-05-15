import { createClient } from "@supabase/supabase-js";

// Server-only client that bypasses RLS via the secret key. Use for admin
// operations (seeding, background jobs, cross-tenant reads). Never import
// from a Client Component or any module reachable by the browser bundle.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
