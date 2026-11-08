import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables are missing. Add them to .env.local.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Separate client for CC and Government officer portals so officer login NEVER overwrites citizen login
export const officerSupabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: 'nagorik-officer-session',
    persistSession: true,
    autoRefreshToken: true
  }
})
