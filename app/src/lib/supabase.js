import { createClient } from '@supabase/supabase-js'

// Null when env vars aren't set — the app falls back to mock data.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const isSupabaseConfigured = !!supabase
