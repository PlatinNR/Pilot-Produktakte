import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Supabase-Client – null, solange die Umgebungsvariablen nicht gesetzt sind (Offline-Modus). */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}

/** E-Mail-Domäne für den Login (Benutzername „Admin" → admin@zollern.de). */
export const ADMIN_EMAIL_DOMAIN = '@zollern.de'
