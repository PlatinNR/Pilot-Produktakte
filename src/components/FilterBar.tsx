import type { Filter } from '../types'
import { isTraceMode, isAggregateMode } from '../utils/aggregate'

interface Props {
  filter: Filter
  onChange: (filter: Filter) => void
  onClear: () => void
}

export function FilterBar({ filter, onChange, onClear }: Props) {
  const set = (patch: Partial<Filter>) => onChange({ ...filter, ...patch })
  const trace = isTraceMode(filter)
  const aggregate = isAggregateMode(filter)

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end gap-3 px-4 py-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Fertigungsauftrag (Leitende Nummer)
          <input
            value={filter.auftragsnummer}
            onChange={(e) => set({ auftragsnummer: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-zollern-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          FN
          <input
            value={filter.fn}
            onChange={(e) => set({ fn: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-zollern-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Datum (ein Tag)
          <input
            type="date"
            value={filter.datum}
            onChange={(e) => set({ datum: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-zollern-500"
          />
        </label>

        <button
          onClick={onClear}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Zurücksetzen
        </button>

        <span className="ml-auto text-xs font-medium">
          {trace && (
            <span className="rounded-full bg-zollern-700 px-2.5 py-1 text-white">
              Trace: Weg des Auftrags
            </span>
          )}
          {aggregate && (
            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">
              Verteilung je Maschine
            </span>
          )}
        </span>
      </div>
    </div>
  )
}
