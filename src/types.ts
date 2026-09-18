// Zentrale Typdefinitionen der Digitalen Produktakte (vereinfachter Ansatz)

/** Eine Prozesskette (z. B. „Testkette") – enthält Abteilungen, Schritte, Maschinen, Nebentabellen */
export interface Chain {
  id: string
  name: string
  /** Allgemeine Produktinfos (Produktinfo-Tab) */
  info?: InfoBereich
}

/** Abteilung (z. B. „Wachs") – gruppiert Schritte und besitzt Nebentabellen */
export interface Abteilung {
  id: string
  chainId: string
  name: string
  /** Übergeordnete Abteilung (für hierarchische Abteilungen) */
  parentId: string | null
  /** Info-Bereich (CAD-Modell, Felder) – optional, ältere Daten haben keinen */
  info?: InfoBereich
}

/** Variabler Bearbeitungsblock – Container mit Schritten in variabler Reihenfolge */
export interface Bearbeitungsblock {
  id: string
  abteilungId: string
  name: string
  /** Position in der Schrittkette (der Block ist ein Knoten in der Kette) */
  position: number
}

/** Ein Produktionsschritt (z. B. „Spritzen", „Modellieren", „Reinigen") */
export interface Schritt {
  id: string
  abteilungId: string
  /** Zugehöriger Variabler Bearbeitungsblock (falls in einem) */
  blockId: string | null
  name: string
  /** Position in der Schrittkette (nur für feste Schritte; Block-Schritte haben 0) */
  position: number
  /** Zusätzliche Felder (zusätzlich zu den festen Spalten Auftragsnummer/FN/Datum/Produktion) */
  columns: TableColumn[]
  /** Schlüssel der zusätzlichen Felder (PK/FK) */
  keys: TableKey[]
  /** Schleifen-Bedingung (z. B. „Schichtdicke < Soll") – wenn erfüllt, wird zurückgesprungen */
  loopCondition: string | null
  /** Schritt-ID, zu der zurückgesprungen wird (Schleife) – kann auch ein Variabler Block sein */
  loopTargetId: string | null
  /** Anzahl der Wiederholungen der Schleife (statt Bedingung) */
  loopWiederholungen: number | null
  /** Optionaler Schritt – kann übersprungen werden, wenn für ein Teil kein Eintrag besteht */
  optional: boolean
}

/** Spaltentyp einer Tabelle */
export type ColumnType = 'text' | 'number' | 'date' | 'time'

export const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  text: 'Text',
  number: 'Zahl',
  date: 'Datum',
  time: 'Uhrzeit',
}

/** Eine Spalte einer Tabelle */
export interface TableColumn {
  id: string
  name: string
  type: ColumnType
  /** Fest eingebaute Spalten (Auftragsnummer, FN, Datum) können nicht umbenannt/gelöscht werden */
  fixed: boolean
}

/** Eine Zeile: Spalten-ID -> Wert */
export type TableRow = Record<string, string>

/** Schlüsselart einer Spalte */
export type KeyType = 'pk' | 'fk'

/** Definition eines Primär- (pk) oder Fremdschlüssels (fk) einer Tabelle */
export interface TableKey {
  id: string
  columnId: string
  type: KeyType
  /** Ziel-Tabelle des Fremdschlüssels (nur bei fk) */
  refTableId: string | null
  /** Ziel-Spalte des Fremdschlüssels (nur bei fk) */
  refColumnId: string | null
  /** Anzeigename der Beziehung (editierbar, z. B. „n" oder „1") */
  label?: string
}

/** Produktionstabelle (= Maschine) – gehört zu genau einem Schritt */
export interface Produktionstabelle {
  id: string
  schrittId: string
  name: string
  /** Feste Arbeitsplatz-Nummer der Maschine – gilt für alle Einträge der Maschine */
  arbeitsplatz: string
  columns: TableColumn[]
  rows: TableRow[]
  keys: TableKey[]
}

/** Nebentabelle – gehört zu einer Abteilung, zeitbezogene Daten (z. B. Wachsqualität) */
export interface Nebentabelle {
  id: string
  abteilungId: string
  name: string
  /** Feste Arbeitsplatz-Nummer – gilt für alle Einträge der Nebentabelle */
  arbeitsplatz: string
  columns: TableColumn[]
  rows: TableRow[]
  keys: TableKey[]
}

/** Info-Feld (Definition) – z. B. Gewicht, Anzahl Trauben */
export interface InfoFeld {
  id: string
  name: string
  type: ColumnType
  /** Wert – wird später je Fertigungsauftrag erfasst */
  value: string
  /** Fest eingebaute Felder (Fertigungsauftrag, FN, Materialnummer) können nicht geändert werden */
  fixed: boolean
}

/** Info-Bereich: CAD-Modell (GLB/glTF) + Feld-Definitionen */
export interface InfoBereich {
  modelUrl: string | null
  modelName: string | null
  felder: InfoFeld[]
}

export function emptyInfo(): InfoBereich {
  return { modelUrl: null, modelName: null, felder: [] }
}

/** Diese Felder sind in jeder Info immer enthalten. */
export const INFO_STANDARD_FELDER: InfoFeld[] = [
  { id: 'fertigungsauftrag', name: 'Fertigungsauftrag', type: 'text', value: '', fixed: true },
  { id: 'fn', name: 'FN', type: 'text', value: '', fixed: true },
  { id: 'materialnummer', name: 'Materialnummer', type: 'text', value: '', fixed: true },
]

/** Zentraler Anwendungszustand */
export interface AppState {
  chains: Chain[]
  activeChainId: string
  abteilungen: Abteilung[]
  bearbeitungsbloecke: Bearbeitungsblock[]
  schritte: Schritt[]
  produktionstabellen: Produktionstabelle[]
  nebentabellen: Nebentabelle[]
}

/** Daten einer einzelnen Prozesskette (als JSON-Dokument in Supabase gespeichert) */
export interface ChainData {
  abteilungen: Abteilung[]
  bearbeitungsbloecke: Bearbeitungsblock[]
  schritte: Schritt[]
  produktionstabellen: Produktionstabelle[]
  nebentabellen: Nebentabelle[]
  /** Allgemeine Produktinfos der Kette */
  info?: InfoBereich
}

/** Standardspalten jeder Produktionstabelle (Auftragsnummer = Leitende Nummer) */
export const PRODUKTION_SPALTEN: TableColumn[] = [
  { id: 'auftragsnummer', name: 'Fertigungsauftrag', type: 'text', fixed: true },
  { id: 'fn', name: 'FN', type: 'text', fixed: true },
  { id: 'datum', name: 'Datum', type: 'date', fixed: true },
  { id: 'zeit', name: 'Uhrzeit', type: 'time', fixed: true },
  { id: 'wdh', name: 'Wiederholung', type: 'text', fixed: true },
]

/** Standardspalte jeder Nebentabelle (zeitlicher Bezug) */
export const NEBEN_SPALTEN: TableColumn[] = [
  { id: 'datum', name: 'Datum', type: 'date', fixed: true },
]

/** Spalten der Schritt-Tabelle (Produktionskette) – Auftragsnummer ist der Primärschlüssel */
export const SCHRITT_TABELLE_SPALTEN: TableColumn[] = [
  { id: 'auftragsnummer', name: 'Fertigungsauftrag', type: 'text', fixed: true },
  { id: 'fn', name: 'FN', type: 'text', fixed: true },
  { id: 'datum', name: 'Datum', type: 'date', fixed: true },
  { id: 'produktion', name: 'Produktion', type: 'text', fixed: true },
]

/** Filterzustand des Dashboards */
export interface Filter {
  auftragsnummer: string
  fn: string
  datum: string
}

export const EMPTY_FILTER: Filter = { auftragsnummer: '', fn: '', datum: '' }
