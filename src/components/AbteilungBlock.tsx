import type { Abteilung, Filter } from '../types'
import { useStore } from '../store'
import { EditableName } from './EditableName'
import { SchrittRow } from './SchrittRow'
import { NebentabellenColumn } from './NebentabellenColumn'

interface Props {
  abteilung: Abteilung
  filter: Filter
}

export function AbteilungBlock({ abteilung, filter }: Props) {
  const alleSchritte = useStore((s) => s.schritte)
  const schritte = alleSchritte.filter((st) => st.abteilungId === abteilung.id)
  const { renameAbteilung, removeAbteilung, addSchritt } = useStore()

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="h-3 w-1 rounded-full bg-zollern-700" />
        <EditableName
          value={abteilung.name}
          onCommit={(name) => renameAbteilung(abteilung.id, name)}
          className="min-w-0 flex-1 bg-transparent text-lg font-bold text-zo-ink outline-none"
        />
        <button
          onClick={() => addSchritt(abteilung.id)}
          className="rounded bg-zollern-700 px-3 py-1 text-xs font-medium text-white hover:bg-zollern-800"
        >
          + Schritt
        </button>
        <button
          onClick={() => removeAbteilung(abteilung.id)}
          className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
          title="Abteilung löschen"
        >
          ✕
        </button>
      </header>

      <div className="flex flex-col gap-4 p-4 lg:flex-row">
        <main className="flex-1">
          {schritte.length === 0 ? (
            <button
              onClick={() => addSchritt(abteilung.id)}
              className="flex min-h-[6rem] w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-400 hover:border-zollern-400 hover:bg-zollern-50 hover:text-zollern-700"
            >
              + Ersten Produktionsschritt hinzufügen
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              {schritte.map((s, i) => (
                <SchrittRow key={s.id} schritt={s} index={i} total={schritte.length} filter={filter} />
              ))}
            </div>
          )}
        </main>

        <NebentabellenColumn abteilungId={abteilung.id} />
      </div>
    </section>
  )
}
