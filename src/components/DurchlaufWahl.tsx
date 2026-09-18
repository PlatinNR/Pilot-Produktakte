import { useState } from 'react'
import type { Produktionstabelle } from '../types'

interface Props {
  tabelle: Produktionstabelle
  auftragsnummer: string
  kompakt?: boolean
}

/**
 * Zeigt die Werte eines Auftrags an einer Maschine.
 * - Schleifen-Wiederholungen (Spalte „Wiederholung") sind wählbar
 * - Mehrere Durchläufe an derselben Maschine sind wählbar
 */
export function DurchlaufWahl({ tabelle, auftragsnummer, kompakt = false }: Props) {
  const [wdhIndex, setWdhIndex] = useState(0)
  const [runIndex, setRunIndex] = useState(0)

  const runs = tabelle.rows.filter((r) => r.auftragsnummer === auftragsnummer)
  if (runs.length === 0) return null

  const wdhWerte = Array.from(
    new Set(runs.map((r) => (r.wdh ?? '').trim()).filter((w) => w.length > 0)),
  )
  const aktiveWdh = wdhWerte.length > 0 ? wdhWerte[Math.min(wdhIndex, wdhWerte.length - 1)] : null
  const gefiltert = aktiveWdh ? runs.filter((r) => (r.wdh ?? '').trim() === aktiveWdh) : runs
  const aktiverIndex = Math.min(runIndex, gefiltert.length - 1)
  const aktiv = gefiltert[aktiverIndex]
  const spalten = tabelle.columns.filter((c) => c.id !== 'auftragsnummer')

  return (
    <div
      className={`rounded-lg border border-zollern-200 bg-zollern-50/70 ${
        kompakt ? 'px-1.5 py-1' : 'px-2.5 py-1.5'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          Werte des Auftrags
        </span>
        {wdhWerte.length > 1 && aktiveWdh && (
          <label className="flex items-center gap-1">
            <select
              value={aktiveWdh}
              onChange={(e) => {
                setWdhIndex(Math.max(0, wdhWerte.indexOf(e.target.value)))
                setRunIndex(0)
              }}
              className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] text-slate-700"
              title="Wiederholung der Schleife wählen"
            >
              {wdhWerte.map((w) => (
                <option key={w} value={w}>
                  Wiederholung {w}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400">von {wdhWerte.length}</span>
          </label>
        )}
        {gefiltert.length > 1 && (
          <label className="flex items-center gap-1">
            <select
              value={aktiverIndex}
              onChange={(e) => setRunIndex(Number(e.target.value))}
              className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] text-slate-700"
              title="Werte eines anderen Durchlaufs anzeigen"
            >
              {gefiltert.map((_, i) => (
                <option key={i} value={i}>
                  Durchlauf {i + 1}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400">von {gefiltert.length}</span>
          </label>
        )}
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
