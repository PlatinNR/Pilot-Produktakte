/** Matte Abteilungsfarben – grün, rot, blau, gelb (zyklisch je Abteilung). */
export const ABTEILUNG_FARBEN = [
  'border-emerald-300 bg-emerald-100/80',
  'border-red-300 bg-red-100/80',
  'border-sky-300 bg-sky-100/80',
  'border-amber-300 bg-amber-100/80',
]

export function abteilungFarbe(index: number): string {
  return ABTEILUNG_FARBEN[index % ABTEILUNG_FARBEN.length]
}
