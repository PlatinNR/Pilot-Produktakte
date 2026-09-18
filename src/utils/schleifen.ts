import type { Bearbeitungsblock, Schritt } from '../types'

/**
 * Anzahl der Schleifen-Wiederholungen für einen Schritt.
 * Eine Schleife endet an einem Schritt (loopTargetId + loopWiederholungen) und umfasst
 * alle Kettenknoten zwischen Ziel und Ende. Ein Variabler Block zählt als ein Knoten;
 * seine Schritte gehören zur Schleife.
 */
export function wiederholungenFuerSchritt(
  schrittId: string,
  schritte: Schritt[],
  bloecke: Bearbeitungsblock[],
): number | null {
  const schritt = schritte.find((s) => s.id === schrittId)
  if (!schritt) return null
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
  if (meinIndex < 0) return null

  let max: number | null = null
  for (const ende of schritte.filter((s) => s.abteilungId === abteilungId && s.loopTargetId)) {
    const anzahl = ende.loopWiederholungen ?? 0
    if (anzahl < 2) continue
    const endeIdx = knotenIndex(ende.id)
    const zielIdx = knotenIndex(ende.loopTargetId ?? '')
    if (endeIdx < 0 || zielIdx < 0 || zielIdx > endeIdx) continue
    if (meinIndex >= zielIdx && meinIndex <= endeIdx) {
      max = max === null ? anzahl : Math.max(max, anzahl)
    }
  }
  return max
}
