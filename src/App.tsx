import { AuthProvider, useAuth } from './lib/auth'
import { useSupabaseSync } from './lib/sync'
import { LoginScreen } from './components/LoginScreen'
import { Dashboard } from './pages/Dashboard'

function AppShell() {
  const { mode, signOut } = useAuth()
  useSupabaseSync(mode)

  const isSignedIn = mode === 'admin' || mode === 'guest'

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-t-4 border-t-zollern-500 border-b border-b-zo-border bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-zollern-500 text-lg font-black text-white">
            Z
          </span>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-widest text-zo-ink">ZOLLERN</div>
            <div className="text-[11px] text-zo-muted">Digitale Produktakte</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {mode === 'guest' && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
              Nur Lesen
            </span>
          )}
          {isSignedIn && (
            <button
              onClick={signOut}
              className="text-xs text-zo-muted hover:text-zo-ink"
            >
              Abmelden
            </button>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1 bg-zo-bg-lighter">
        {mode === 'loading' && (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Lade…
          </div>
        )}
        {mode === 'signedOut' && <LoginScreen />}
        {isSignedIn && <Dashboard />}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App
