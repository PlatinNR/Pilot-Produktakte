import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured, ADMIN_EMAIL_DOMAIN } from './supabase'
import { useStore } from '../store'

export type Mode = 'loading' | 'signedOut' | 'admin' | 'guest'

interface AuthValue {
  mode: Mode
  configured: boolean
  signInAdmin: (username: string, password: string) => Promise<string | null>
  signInGuest: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  // Offline-Modus (ohne Supabase) startet direkt im Admin-Modus
  const [mode, setMode] = useState<Mode>(configured ? 'loading' : 'admin')
  const setReadOnly = useStore((s) => s.setReadOnly)

  useEffect(() => {
    if (!configured) return
    supabase!.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) {
          setReadOnly(false)
          setMode('admin')
        } else {
          setMode('signedOut')
        }
      })
      .catch(() => setMode('signedOut'))
  }, [configured, setReadOnly])

  const signInAdmin = async (username: string, password: string): Promise<string | null> => {
    if (!supabase) return 'Supabase ist nicht konfiguriert.'
    const email = `${username.trim().toLowerCase()}${ADMIN_EMAIL_DOMAIN}`
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    setReadOnly(false)
    setMode('admin')
    return null
  }

  const signInGuest = () => {
    setReadOnly(true)
    setMode('guest')
  }

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setMode('signedOut')
  }

  return (
    <AuthContext.Provider
      value={{ mode, configured: isSupabaseConfigured(), signInAdmin, signInGuest, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth muss innerhalb des AuthProvider verwendet werden')
  return ctx
}
