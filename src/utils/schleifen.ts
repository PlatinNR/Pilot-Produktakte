import type { Bearbeitungsblock, Schritt } from '../types'

export interface SchleifenInfo {
  /** Schritt liegt im Körper einer Schleife (Rücksprung definiert) */
  inSchleife: boolean
  /** Anzahl der Wiederholungen, falls an der Schleife definiert (Altbestand) */
  anzahl: number | null
}

/**
 * Ermittelt, ob ein Schritt in einer Schleife liegt.
 * Eine Schleife endet an einem Schritt (loopTargetId) und umfasst alle Kettenknoten
 * zwischen Ziel und Ende. Ein Variabler Block zählt als ein Knoten; seine Schritte gehören dazu.
 */
export function schleifenInfoFuerSchritt(
  schrittId: string,
  schritte: Schritt[],
  bloecke: Bearbeitungsblock[],
): SchleifenInfo {
  const leer: SchleifenInfo = { inSchleife: false, anzahl: null }
  const schritt = schritte.find((s) => s.id === schrittId)
  if (!schritt) return leer
  const abteilungId = schritt.abteilungId

  const knoten: { id: string; istBlock: boolean; pos: number }[] = []
  for (const st of schritte.filter((s) => s.abteilungId === abteilungId && !s.blockId)) {
    knoten.push({ id: st.id, istBlock: false, pos: st.position })
  }
  for (const b of bloecke.filter((x) => x.abteilungId === abteilungId)) {
    knoten.push({ id: b.id, istBlock: true, pos: b.position })
  }
  knoten.sort((a, b) => a.pos - b.pos)

  const knotenIndex = (id: string): number => {
    const st = schritte.find((s) => s.id === id)
    if (st) {
      if (st.blockId) return knoten.findIndex((k) => k.istBlock && k.id === st.blockId)
      return knoten.findIndex((k) => !k.istBlock && k.id === id)
    }
    if (bloecke.some((b) => b.id === id)) {
      return knoten.findIndex((k) => k.istBlock && k.id === id)
    }
    return -1
  }

  const meinIndex = knotenIndex(schrittId)
  if (meinIndex < 0) return leer

  let inSchleife = false
  let anzahl: number | null = null
  for (const ende of schritte.filter((s) => s.abteilungId === abteilungId && s.loopTargetId)) {
    const endeIdx = knotenIndex(ende.id)
    const zielIdx = knotenIndex(ende.loopTargetId ?? '')
    if (endeIdx < 0 || zielIdx < 0 || zielIdx > endeIdx) continue
    if (meinIndex >= zielIdx && meinIndex <= endeIdx) {
      inSchleife = true
      const n = ende.loopWiederholungen ?? 0
      if (n >= 2) anzahl = anzahl === null ? n : Math.max(anzahl, n)
    }
  }
  return { inSchleife, anzahl }
}
