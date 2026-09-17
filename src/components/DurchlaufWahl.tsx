import { useState } from 'react'
import type { Produktionstabelle } from '../types'

interface Props {
  tabelle: Produktionstabelle
  auftragsnummer: string
  kompakt?: boolean
}

/**
 * Zeigt die Werte eines Auftrags an einer Maschine.
 * Wurde die Maschine mehrfach durchlaufen (Arbeitswiederholung), kann der Durchlauf gewählt werden.
 */
export function DurchlaufWahl({ tabelle, auftragsnummer, kompakt = false }: Props) {
  const [index, setIndex] = useState(0)
  const runs = tabelle.rows.filter((r) => r.auftragsnummer === auftragsnummer)
  // Nur bei mehreren Durchläufen (Arbeitswiederholungen) anzeigen
  if (runs.length < 2) return null

  const aktiv = runs[Math.min(index, runs.length - 1)]
  const spalten = tabelle.columns.filter((c) => c.id !== 'auftragsnummer')

  return (
    <div
      className={`rounded-lg border border-zollern-200 bg-zollern-50/70 ${
        kompakt ? 'px-1.5 py-1' : 'px-2.5 py-1.5'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          Arbeitswiederholung
        </span>
        <label className="flex items-center gap-1">
          <select
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] text-slate-700"
            title="Werte eines anderen Durchlaufs anzeigen"
          >
            {runs.map((_, i) => (
              <option key={i} value={i}>
                Durchlauf {i + 1}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-slate-400">von {runs.length}</span>
        </label>
      </div>
      <div className={`mt-1 grid gap-x-3 gap-y-0.5 ${kompakt ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
        {spalten.map((c) => (
          <div key={c.id} className="flex items-baseline gap-1 text-xs">
            <span className="shrink-0 text-slate-400">{c.name}:</span>
            <span className="truncate font-semibold text-slate-800">{aktiv[c.id] || '–'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
