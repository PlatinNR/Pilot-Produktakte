import { useState } from 'react'
import type { Filter } from '../types'
import { EMPTY_FILTER } from '../types'
import { useStore } from '../store'
import { isTraceMode } from '../utils/aggregate'
import { loadFromCloud, saveAllChains, useSyncStatus } from '../lib/sync'
import { FilterBar } from '../components/FilterBar'
import { TraceView } from '../components/TraceView'
import { AbteilungBlock } from '../components/AbteilungBlock'
import { TabellenbezogenView } from '../components/TabellenbezogenView'
import { ProduktHinzufuegenView } from '../components/ProduktHinzufuegenView'
import { ProduktinfoPanel } from '../components/ProduktinfoPanel'
import { EditableName } from '../components/EditableName'

type View = 'zusammen' | 'tabellen' | 'produkt'

export function Dashboard() {
  const alleAbteilungen = useStore((s) => s.abteilungen)
  const activeChainId = useStore((s) => s.activeChainId)
  const chains = useStore((s) => s.chains)
  const setActiveChain = useStore((s) => s.setActiveChain)
  const addChain = useStore((s) => s.addChain)
  const renameChain = useStore((s) => s.renameChain)
  const addAbteilung = useStore((s) => s.addAbteilung)
  const sync = useSyncStatus()
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER)
  const [view, setView] = useState<View>('zusammen')
  const [produktinfoOffen, setProduktinfoOffen] = useState(false)

  const abteilungen = alleAbteilungen.filter((a) => a.chainId === activeChainId)
  const activeChain = chains.find((c) => c.id === activeChainId)

  const handleUpload = async () => {
    await saveAllChains()
  }

  const handleDownload = async () => {
    await loadFromCloud()
  }

  const busy = sync.phase !== 'idle'
  const statusText = sync.lastError
    ? `Fehler: ${sync.lastError}`
    : sync.phase === 'saving'
      ? 'Speichert…'
      : sync.phase === 'loading'
        ? 'Lädt…'
        : sync.lastSavedAt
          ? `Gespeichert ${new Date(sync.lastSavedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`
          : sync.cloudChecked && sync.cloudEmpty
            ? 'Cloud ist leer'
            : sync.cloudChecked
              ? 'Cloud verbunden'
              : 'Cloud wird geprüft…'

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zo-ink">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Fertigungsauftrag als Leitende Nummer – Trace oder Verteilung je Maschine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={activeChainId}
            onChange={(e) => setActiveChain(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-zollern-500"
            title="Prozesskette wechseln"
          >
            {chains.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <EditableName
            iconOnly
            value={activeChain?.name ?? ''}
            onCommit={(name) => renameChain(activeChainId, name)}
          />
          <button
            onClick={() => addChain()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            title="Neue Prozesskette"
          >
            + Kette
          </button>
          <button
            onClick={handleUpload}
            disabled={busy}
            className="rounded-lg bg-zollern-700 px-4 py-2 text-sm font-medium text-white hover:bg-zollern-800 disabled:opacity-60"
            title="Lokale Daten in die Cloud hochladen"
          >
            {sync.phase === 'saving' ? 'Speichert…' : 'In Cloud speichern'}
          </button>
          <button
            onClick={handleDownload}
            disabled={busy}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            title="Stand aus der Cloud laden (ersetzt lokale Daten)"
          >
            {sync.phase === 'loading' ? 'Lädt…' : 'Aus Cloud laden'}
          </button>
          <button
            onClick={() => addAbteilung()}
            className="rounded-lg border border-zollern-700 px-4 py-2 text-sm font-medium text-zollern-700 hover:bg-zollern-50"
          >
            + Abteilung
          </button>
        </div>
      </header>

      <p className={`text-xs ${sync.lastError ? 'text-red-600' : 'text-slate-500'}`}>{statusText}</p>

      {sync.cloudChecked && sync.cloudEmpty && chains.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>
            Die Cloud ist leer – diese Daten liegen nur in diesem Browser. Lade sie hoch, damit sie auf
            allen PCs sichtbar sind.
          </span>
          <button
            onClick={handleUpload}
            disabled={busy}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
          >
            Jetzt hochladen
          </button>
        </div>
      )}

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setView('zusammen')}
          className={`px-4 py-2 text-sm font-medium ${
            view === 'zusammen'
              ? 'border-b-2 border-zollern-500 text-zollern-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Zusammengefasst
        </button>
        <button
          onClick={() => setView('tabellen')}
          className={`px-4 py-2 text-sm font-medium ${
            view === 'tabellen'
              ? 'border-b-2 border-zollern-500 text-zollern-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Tabellenbezogen
        </button>
        <button
          onClick={() => setView('produkt')}
          className={`px-4 py-2 text-sm font-medium ${
            view === 'produkt'
              ? 'border-b-2 border-zollern-500 text-zollern-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Produkt hinzufügen
        </button>
      </div>

      {view !== 'produkt' && (
        <>
          <FilterBar filter={filter} onChange={setFilter} onClear={() => setFilter(EMPTY_FILTER)} />

          {/* Produktinfo – Tab direkt unter dem Suchblock */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setProduktinfoOffen((o) => !o)}
              className={`px-4 py-2 text-sm font-medium ${
                produktinfoOffen
                  ? 'border-b-2 border-zollern-500 text-zollern-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Produktinfo
            </button>
          </div>

          {produktinfoOffen && <ProduktinfoPanel chainId={activeChainId} />}
        </>
      )}

      {view === 'produkt' ? (
        <ProduktHinzufuegenView />
      ) : view === 'zusammen' ? (
        <>
          {isTraceMode(filter) && <TraceView auftragsnummer={filter.auftragsnummer.trim()} />}

          <div className="flex flex-col gap-4">
            {abteilungen.length === 0 && (
              <button
                onClick={() => addAbteilung()}
                className="flex min-h-[10rem] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-zollern-400 hover:bg-zollern-50 hover:text-zollern-700"
              >
                + Erste Abteilung hinzufügen
              </button>
            )}
            {abteilungen.map((a, i) => (
              <AbteilungBlock key={a.id} abteilung={a} filter={filter} index={i} />
            ))}
          </div>
        </>
      ) : (
        <TabellenbezogenView filter={filter} />
      )}
    </div>
  )
}
