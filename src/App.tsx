import { useSupabaseSync } from './lib/sync'
import { Dashboard } from './pages/Dashboard'

function AppShell() {
  useSupabaseSync()

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
        <div className="hidden text-xs text-zo-muted sm:block">Produktions-Dashboard</div>
      </header>

      <main className="min-h-0 flex-1 bg-zo-bg-lighter">
        <Dashboard />
      </main>
    </div>
  )
}

function App() {
  return <AppShell />
}

export default App
