import type { Filter, Produktionstabelle, Schritt, TableRow } from '../types'

/** Ist ein Trace-Modus aktiv (Auftragsnummer bekannt)? */
export function isTraceMode(filter: Filter): boolean {
  return filter.auftragsnummer.trim().length > 0
}

/** Ist ein Aggregations-Filter aktiv (FN oder Datum, aber keine Auftragsnummer)? */
export function isAggregateMode(filter: Filter): boolean {
  return !isTraceMode(filter) && (filter.fn.trim().length > 0 || filter.datum.length > 0)
}

/** Prüft, ob eine Zeile zu einem Aggregations-Filter passt (FN UND Datum, falls gesetzt). */
export function matchesFilter(row: { fn?: string; datum?: string }, filter: Filter): boolean {
  let ok = true
  if (filter.fn.trim().length > 0) ok = ok && row.fn === filter.fn.trim()
  if (filter.datum.length > 0) ok = ok && row.datum === filter.datum
  return ok
}

export interface MaschinenAnteil {
  tabelle: Produktionstabelle
  count: number
  percent: number
}

export interface SchrittAggregation {
  schrittId: string
  entries: MaschinenAnteil[]
  total: number
}

/** Modus B: Verteilung der Durchläufe (Zeilen) über die Maschinen eines Schritts. */
export function aggregateSchritt(
  schritt: Schritt,
  maschinen: Produktionstabelle[],
  filter: Filter,
): SchrittAggregation {
  const entries: MaschinenAnteil[] = maschinen.map((t) => {
    const count = t.rows.filter((r) => matchesFilter(r, filter)).length
    return { tabelle: t, count, percent: 0 }
  })
  const total = entries.reduce((sum, e) => sum + e.count, 0)
  for (const e of entries) {
    e.percent = total > 0 ? (e.count / total) * 100 : 0
  }
  return { schrittId: schritt.id, entries, total }
}

export interface TraceStop {
  schritt: Schritt
  tabelle?: Produktionstabelle
  row?: TableRow
}

export interface TraceResult {
  stops: TraceStop[]
  datum?: string
  fn?: string
  found: boolean
}

/** Modus A: Weg eines Fertigungsauftrags durch die Maschinen je Schritt. */
export function traceAuftrag(
  schritte: Schritt[],
  maschinen: Produktionstabelle[],
  auftragsnummer: string,
): TraceResult {
  const stops: TraceStop[] = schritte.map((schritt) => {
    const schrittMaschinen = maschinen.filter((t) => t.schrittId === schritt.id)
    const tabelle = schrittMaschinen.find((t) =>
      t.rows.some((r) => r.auftragsnummer === auftragsnummer),
    )
    const row = tabelle?.rows.find((r) => r.auftragsnummer === auftragsnummer)
    return { schritt, tabelle, row }
  })

  const found = stops.some((s) => s.row)
  const datum = stops.map((s) => s.row?.datum).find((d) => !!d) ?? undefined
  const fn = stops.map((s) => s.row?.fn).find((f) => !!f) ?? undefined

  return { stops, datum, fn, found }
}

export function formatPercent(percent: number): string {
  return `${Math.round(percent * 10) / 10}%`.replace('.0%', '%')
}

export const MASCHINEN_FARBEN = [
  'bg-zollern-700',
  'bg-zollern-500',
  'bg-zollern-300',
  'bg-zollern-200',
  'bg-slate-400',
  'bg-slate-300',
]
