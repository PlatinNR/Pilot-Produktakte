import type { TableColumn, TabellenRegister } from '../types'

export const DEFAULT_REGISTER_ID = 'allgemein'
export const DEFAULT_REGISTER_NAME = 'Allgemein'

/**
 * Gibt die Liste der Register einer Tabelle zurück.
 * Falls keine definiert sind, wird der Standard-Reiter "Allgemein" geliefert.
 */
export function getTabellenRegister(tabelle?: { register?: TabellenRegister[] } | null): TabellenRegister[] {
  if (tabelle?.register && tabelle.register.length > 0) {
    return tabelle.register
  }
  return [{ id: DEFAULT_REGISTER_ID, name: DEFAULT_REGISTER_NAME }]
}

/**
 * Gibt die Register-ID einer Spalte zurück (Default: 'allgemein').
 */
export function getColumnRegisterId(col: TableColumn): string {
  return col.registerId || DEFAULT_REGISTER_ID
}

/**
 * Filtert die sichtbaren Spalten einer Tabelle basierend auf dem aktiven Register:
 * - Feste Pflichtspalten (fixed: true) sind IMMER sichtbar.
 * - Ist activeRegisterId === null (eingeklappt), sind NUR die festen Spalten sichtbar.
 * - Ansonsten werden feste Spalten + Spalten des aktiven Registers angezeigt.
 */
export function filterColumnsByRegister(
  columns: TableColumn[],
  activeRegisterId: string | null | undefined,
): TableColumn[] {
  // Wenn eingeklappt: nur Pflichtdaten
  if (activeRegisterId === null) {
    return columns.filter((c) => c.fixed)
  }
  const regId = activeRegisterId || DEFAULT_REGISTER_ID
  return columns.filter((c) => c.fixed || getColumnRegisterId(c) === regId)
}

/**
 * Zählt die variablen (nicht-festen) Spalten, die zu einem Register gehören.
 */
export function countColumnsInRegister(columns: TableColumn[], registerId: string): number {
  return columns.filter((c) => !c.fixed && getColumnRegisterId(c) === registerId).length
}
