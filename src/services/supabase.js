import { createClient } from '@supabase/supabase-js'

const functionUrl = import.meta.env.VITE_SUPABASE_FUNCTION_URL
const projectUrl = import.meta.env.VITE_SUPABASE_URL || functionUrl?.replace(/\/functions\/v1\/.*$/, '')
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(projectUrl && publishableKey)
export const supabase = isSupabaseConfigured
  ? createClient(projectUrl, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null
