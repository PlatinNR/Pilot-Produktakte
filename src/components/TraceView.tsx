import { useStore } from '../store'
import { traceAuftrag } from '../utils/aggregate'

interface Props {
  auftragsnummer: string
}

export function TraceView({ auftragsnummer }: Props) {
  const activeChainId = useStore((s) => s.activeChainId)
  const abteilungen = useStore((s) => s.abteilungen)
  const alleSchritte = useStore((s) => s.schritte)
  const alleMaschinen = useStore((s) => s.produktionstabellen)
  const alleNeben = useStore((s) => s.nebentabellen)

  const abteilungIds = new Set(abteilungen.filter((a) => a.chainId === activeChainId).map((a) => a.id))
  const schritte = alleSchritte.filter((st) => abteilungIds.has(st.abteilungId))
  const schrittIds = new Set(schritte.map((st) => st.id))
  const produktionstabellen = alleMaschinen.filter((t) => schrittIds.has(t.schrittId))
  const nebentabellen = alleNeben.filter((n) => abteilungIds.has(n.abteilungId))

  const trace = traceAuftrag(schritte, produktionstabellen, auftragsnummer)

  if (!trace.found) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Auftrag „{auftragsnummer}" wurde in keiner Maschine gefunden.
      </div>
    )
  }

  const nebenZuZeitpunkt = nebentabellen
    .map((n) => ({ tabelle: n, row: n.rows.find((r) => r.datum === trace.datum) }))
    .filter((x) => x.row)

  return (
    <div className="rounded-lg border border-zollern-200 bg-zollern-50/60 p-4">
      <div className="mb-2 flex items-center gap-3 text-sm">
        <span className="font-bold text-zo-ink">Auftrag {auftragsnummer}</span>
        {trace.fn && <span className="rounded bg-white px-2 py-0.5 text-xs text-slate-600">FN: {trace.fn}</span>}
        {trace.datum && (
          <span className="rounded bg-white px-2 py-0.5 text-xs text-slate-600">Datum: {trace.datum}</span>
        )}
      </div>

      <div className="flex flex-wrap items-stretch gap-2">
        {trace.stops.map((stop, i) => (
          <div key={stop.schritt.id} className="flex items-center gap-2">
            <div
              className={`rounded-lg border px-3 py-2 ${
                stop.tabelle
                  ? 'border-zollern-500 bg-white shadow-sm'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{stop.schritt.name}</div>
              <div className={`text-sm font-semibold ${stop.tabelle ? 'text-zollern-800' : 'text-slate-400'}`}>
                {stop.tabelle ? stop.tabelle.name : '—'}
              </div>
            </div>
            {i < trace.stops.length - 1 && <span className="text-lg font-bold text-zollern-400">→</span>}
          </div>
        ))}
      </div>

      {nebenZuZeitpunkt.length > 0 && (
        <div className="mt-3 border-t border-zollern-200 pt-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nebentabellen zum Zeitpunkt {trace.datum}
          </div>
          <div className="flex flex-wrap gap-2">
            {nebenZuZeitpunkt.map(({ tabelle, row }) => (
              <div key={tabelle.id} className="rounded border border-slate-200 bg-white px-3 py-2">
                <div className="text-xs font-semibold text-slate-700">{tabelle.name}</div>
                {tabelle.columns
                  .filter((c) => c.id !== 'datum')
                  .map((c) => (
                    <div key={c.id} className="mt-1 flex items-baseline gap-2 text-xs">
                      <span className="text-slate-400">{c.name}:</span>
                      <span className="font-semibold text-slate-800">{row?.[c.id] || '–'}</span>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
