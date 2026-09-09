import { useState } from 'react'
import { useAuth } from '../lib/auth'

export function LoginScreen() {
  const { signInAdmin, signInGuest, configured } = useAuth()
  const [username, setUsername] = useState('Admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await signInAdmin(username, password)
    if (err) setError(err)
    setBusy(false)
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-zollern-500 text-lg font-black text-white">
            Z
          </span>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-widest text-zo-ink">ZOLLERN</div>
            <div className="text-[11px] text-zo-muted">Digitale Produktakte</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Benutzername
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-zollern-500"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Passwort
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-zollern-500"
            />
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !username || !password}
            className="w-full rounded-lg bg-zollern-700 px-4 py-2 text-sm font-medium text-white hover:bg-zollern-800 disabled:opacity-50"
          >
            {busy ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>

        <button
          onClick={signInGuest}
          className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Als Gast ansehen (nur lesen)
        </button>

        {!configured && (
          <p className="mt-3 text-xs text-amber-600">
            Supabase nicht konfiguriert – Offline-Modus.
          </p>
        )}
      </div>
    </div>
  )
}
