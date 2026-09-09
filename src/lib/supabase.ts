import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase-Client – null, solange die Umgebungsvariablen nicht gesetzt sind (Offline-Modus). */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}

/** Feste E-Mail des Admin-Kontos (Login erfolgt im Tool ohne E-Mail-Eingabe). */
export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined) || 'admin@zollern.de'
