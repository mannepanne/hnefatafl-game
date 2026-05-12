import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase env vars not set — run mcp__supabase__provision_database first. ' +
    'Queries will fail silently until VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are in .env.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  // PKCE keeps the code_verifier in this iframe's localStorage so a magic-link
  // ?code= forwarded from the claude.ai session page can only be exchanged by
  // the iframe that initiated the sign-in.
  auth: { flowType: 'pkce' },
})
