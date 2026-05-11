import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

let _adminClient: SupabaseClient<Database> | null = null

/**
 * Service-role client — bypasses RLS. Lazy singleton (stateless: no session, no token refresh).
 * Must only be used in server-side code (API routes, server actions, webhooks).
 */
export function createAdminClient(): SupabaseClient<Database> {
  if (!_adminClient) {
    _adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return _adminClient
}
