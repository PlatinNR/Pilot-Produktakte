import { useStore } from '../store'
import type { Produktionstabelle } from '../types'
import { traceAuftrag } from '../utils/aggregate'
import { istInSchleife } from '../utils/schleifen'
import { DurchlaufWahl } from './DurchlaufWahl'
import { useT, useAktuelleSprache } from '../lib/sprache'
import { spaltenName } from '../lib/i18n'

interface Props {
  auftragsnummer: string
}

export function TraceView({ auftragsnummer }: Props) {
  const t = useT()
  const sprache = useAktuelleSprache()
  const activeChainId = useStore((s) => s.activeChainId)
  const abteilungen = useStore((s) => s.abteilungen)
  const alleSchritte = useStore((s) => s.schritte)
  const alleMaschinen = useStore((s) => s.produktionstabellen)
  const alleNeben = useStore((s) => s.nebentabellen)
  const alleBloecke = useStore((s) => s.bearbeitungsbloecke)

  const abteilungIds = new Set(abteilungen.filter((a) => a.chainId === activeChainId).map((a) => a.id))
  const schritte = alleSchritte.filter((st) => abteilungIds.has(st.abteilungId))
  const schrittIds = new Set(schritte.map((st) => st.id))
  const produktionstabellen = alleMaschinen.filter((t) => schrittIds.has(t.schrittId))
  const nebentabellen = alleNeben.filter((n) => abteilungIds.has(n.abteilungId))

  // Schritte in einem Variablen Bearbeitungsblock werden nach Datum + Uhrzeit des Eintrags geordnet
  const stepDatum = (stepId: string): string => {
    for (const m of alleMaschinen) {
      if (m.schrittId !== stepId) continue
      const row = m.rows.find((r) => r.auftragsnummer === auftragsnummer)
      if (row) return `${row.datum ?? ''}T${row.zeit ?? ''}`
    }
    return ''
  }
  const orderedSchritte = [...schritte].sort((a, b) => {
    if (a.blockId && a.blockId === b.blockId) {
      return (stepDatum(a.id) || '9999').localeCompare(stepDatum(b.id) || '9999')
    }
    return 0
  })

  const trace = traceAuftrag(orderedSchritte, produktionstabellen, auftragsnummer)

  if (!trace.found) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {t('Auftrag „{name}" wurde in keiner Maschine gefunden.', { name: auftragsnummer })}
      </div>
    )
  }

  const nebenZuZeitpunkt = nebentabellen
    .map((n) => ({ tabelle: n, row: n.rows.find((r) => r.datum === trace.datum) }))
    .filter((x) => x.row)

  return (
    <div className="rounded-lg border border-zollern-200 bg-zollern-50/60 p-4">
      <div className="mb-2 flex items-center gap-3 text-sm">
        <span className="font-bold text-zo-ink">{t('Auftrag {name}', { name: auftragsnummer })}</span>
        {trace.fn && <span className="rounded bg-white px-2 py-0.5 text-xs text-slate-600">FN: {trace.fn}</span>}
        {trace.datum && (
          <span className="rounded bg-white px-2 py-0.5 text-xs text-slate-600">Datum: {trace.datum}</span>
        )}
      </div>

      <div className="flex flex-wrap items-stretch gap-2">
        {trace.stops.map((stop, i) => {
          const eintrag = (t: Produktionstabelle) =>
            t.rows.find((r) => r.auftragsnummer === auftragsnummer)
          // Mehrere Maschinen im selben Schritt: nach Datum + Uhrzeit sortieren
          const tabellen = [...(stop.tabellen ?? (stop.tabelle ? [stop.tabelle] : []))].sort((a, b) => {
            const ra = eintrag(a)
            const rb = eintrag(b)
            return `${ra?.datum ?? ''}T${ra?.zeit ?? ''}`.localeCompare(
              `${rb?.datum ?? ''}T${rb?.zeit ?? ''}`,
            )
          })
          const skipped = tabellen.length === 0 && stop.schritt.optional
          return (
            <div key={stop.schritt.id} className="flex items-center gap-2">
              <div
                className={`rounded-lg border px-3 py-2 ${
                  tabellen.length > 0
                    ? 'border-zollern-500 bg-white shadow-sm'
                    : skipped
                      ? 'border-dashed border-slate-300 bg-slate-50'
                      : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  {stop.schritt.name}
                  {stop.schritt.optional && <span className="ml-1 text-slate-300">(opt.)</span>}
                  {istInSchleife(stop.schritt.id, alleSchritte, alleBloecke) && (
                    <span className="ml-1 text-zollern-600" title="Schritt liegt in einer Schleife">
                      {t('⟲ Schleife')}
                    </span>
                  )}
                </div>
                {tabellen.length > 0 ? (
                  tabellen.map((t, ti) => {
                    const r = eintrag(t)
                    return (
                      <div key={t.id} className="mt-1">
                        <div className="flex items-baseline gap-1.5 text-sm font-semibold text-zollern-800">
                          {tabellen.length > 1 && (
                            <span className="text-[10px] font-bold text-zollern-500">{ti + 1}.</span>
                          )}
                          {t.name}
                          {(r?.datum || r?.zeit) && (
                            <span className="text-[10px] font-normal text-slate-400">
                              {r?.datum}
                              {r?.zeit ? ` · ${r.zeit}` : ''}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          <DurchlaufWahl tabelle={t} auftragsnummer={auftragsnummer} kompakt />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div
                    className={`text-sm font-semibold ${
                      skipped ? 'text-slate-300 italic' : 'text-slate-400'
                    }`}
                  >
                    {skipped ? t('übersprungen') : '—'}
                  </div>
                )}
              </div>
              {i < trace.stops.length - 1 && <span className="text-lg font-bold text-zollern-400">→</span>}
            </div>
          )
        })}
      </div>

      {nebenZuZeitpunkt.length > 0 && (
        <div className="mt-3 border-t border-zollern-200 pt-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('Nebentabellen zum Zeitpunkt {datum}', { datum: trace.datum ?? '' })}
          </div>
          <div className="flex flex-wrap gap-2">
            {nebenZuZeitpunkt.map(({ tabelle, row }) => (
              <div key={tabelle.id} className="rounded border border-slate-200 bg-white px-3 py-2">
                <div className="text-xs font-semibold text-slate-700">{tabelle.name}</div>
                {tabelle.columns
                  .filter((c) => c.id !== 'datum')
                  .map((c) => (
                    <div key={c.id} className="mt-1 flex items-baseline gap-2 text-xs">
                      <span className="text-slate-400">{spaltenName(c, sprache)}:</span>
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
