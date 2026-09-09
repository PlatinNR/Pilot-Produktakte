import { useState } from 'react'
import type { Filter } from '../types'
import { EMPTY_FILTER } from '../types'
import { useStore } from '../store'
import { isTraceMode } from '../utils/aggregate'
import { FilterBar } from '../components/FilterBar'
import { TraceView } from '../components/TraceView'
import { AbteilungBlock } from '../components/AbteilungBlock'
import { TabellenbezogenView } from '../components/TabellenbezogenView'
import { EditableName } from '../components/EditableName'

type View = 'zusammen' | 'tabellen'

export function Dashboard() {
  const alleAbteilungen = useStore((s) => s.abteilungen)
  const activeChainId = useStore((s) => s.activeChainId)
  const chains = useStore((s) => s.chains)
  const setActiveChain = useStore((s) => s.setActiveChain)
  const addChain = useStore((s) => s.addChain)
  const renameChain = useStore((s) => s.renameChain)
  const addAbteilung = useStore((s) => s.addAbteilung)
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER)
  const [view, setView] = useState<View>('zusammen')

  const abteilungen = alleAbteilungen.filter((a) => a.chainId === activeChainId)
  const activeChain = chains.find((c) => c.id === activeChainId)

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
            value={activeChain?.name ?? ''}
            onCommit={(name) => renameChain(activeChainId, name)}
            className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-zollern-500"
          />
          <button
            onClick={() => addChain()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            title="Neue Prozesskette"
          >
            + Kette
          </button>
          <button
            onClick={() => addAbteilung()}
            className="rounded-lg border border-zollern-700 px-4 py-2 text-sm font-medium text-zollern-700 hover:bg-zollern-50"
          >
            + Abteilung
          </button>
        </div>
      </header>

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
      </div>

      <FilterBar filter={filter} onChange={setFilter} onClear={() => setFilter(EMPTY_FILTER)} />

      {view === 'zusammen' ? (
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
            {abteilungen.map((a) => (
              <AbteilungBlock key={a.id} abteilung={a} filter={filter} />
            ))}
          </div>
        </>
      ) : (
        <TabellenbezogenView filter={filter} />
      )}
    </div>
  )
}
