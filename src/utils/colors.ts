/** Matte Abteilungsfarben – grün, rot, blau, gelb (zyklisch je Abteilung). */
export const ABTEILUNG_FARBEN = [
  'border-emerald-200 bg-emerald-50',
  'border-red-200 bg-red-50',
  'border-sky-200 bg-sky-50',
  'border-amber-200 bg-amber-50',
]

export function abteilungFarbe(index: number): string {
  return ABTEILUNG_FARBEN[index % ABTEILUNG_FARBEN.length]
}
