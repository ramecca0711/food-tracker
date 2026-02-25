import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton — deferred so Next.js can import this module at build time
// without throwing "supabaseUrl is required" (NEXT_PUBLIC_* env vars are
// substituted at build time only when present; this guard keeps the build safe).
let _client: SupabaseClient | null = null;

// Browser-side Supabase client using the public anon key.
// All callers use this singleton to avoid creating multiple GoTrue instances.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      _client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'food-log-auth',
          },
        }
      );
    }
    const value = (_client as any)[prop];
    // Bind methods so `this` stays correct when called as supabase.auth.getSession()
    return typeof value === 'function' ? value.bind(_client) : value;
  },
});
