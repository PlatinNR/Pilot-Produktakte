import { useSyncExternalStore } from 'react'
import { useStore } from '../store'
import type { TabellenKopie } from '../types'

let status: string | null = null
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | null = null
/** Fallback, wenn der Browser keinen Zwischenablage-Zugriff erlaubt */
let interneAblage: TabellenKopie | null = null

function setStatus(text: string | null) {
  status = text
  for (const l of listeners) l()
  if (timer) clearTimeout(timer)
  if (text) timer = setTimeout(() => setStatus(null), 3000)
}

/** Statusmeldung für die Oberfläche (Toast). */
export function useKopieStatus(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}

async function inZwischenablage(kopie: TabellenKopie): Promise<boolean> {
  interneAblage = kopie
  try {
    await navigator.clipboard.writeText(JSON.stringify(kopie))
    return true
  } catch {
    return false
  }
}

async function ausZwischenablage(): Promise<TabellenKopie | null> {
  try {
    const text = await navigator.clipboard.readText()
    const daten = JSON.parse(text) as TabellenKopie
    if (daten && daten.typ === 'produktakte-tabelle') return daten
    return null
  } catch {
    return interneAblage
  }
}

/** Kopiert eine Maschinentabelle samt Spalten, Schlüsseln und Zeilen. */
export async function kopiereMaschine(tabelleId: string): Promise<void> {
  const t = useStore.getState().produktionstabellen.find((x) => x.id === tabelleId)
  if (!t) return
  const kopie: TabellenKopie = {
    typ: 'produktakte-tabelle',
    version: 1,
    art: 'maschine',
    name: t.name,
    arbeitsplatz: t.arbeitsplatz,
    columns: t.columns,
    rows: t.rows,
    keys: t.keys,
    quelle: { schrittId: t.schrittId },
  }
  const ok = await inZwischenablage(kopie)
  setStatus(ok ? `„${t.name}" kopiert` : `„${t.name}" kopiert (App-Ablage)`)
}

/** Kopiert eine Nebentabelle samt Spalten, Schlüsseln und Zeilen. */
export async function kopiereNebentabelle(tabelleId: string): Promise<void> {
  const t = useStore.getState().nebentabellen.find((x) => x.id === tabelleId)
  if (!t) return
  const kopie: TabellenKopie = {
    typ: 'produktakte-tabelle',
    version: 1,
    art: 'nebentabelle',
    name: t.name,
    arbeitsplatz: t.arbeitsplatz,
    columns: t.columns,
    rows: t.rows,
    keys: t.keys,
    quelle: { abteilungId: t.abteilungId },
  }
  const ok = await inZwischenablage(kopie)
  setStatus(ok ? `„${t.name}" kopiert` : `„${t.name}" kopiert (App-Ablage)`)
}

/** Fügt eine kopierte Maschinentabelle am Schritt ein. */
export async function einfuegenMaschine(schrittId: string): Promise<void> {
  const kopie = await ausZwischenablage()
  if (!kopie) {
    setStatus('Zwischenablage leer oder unbekanntes Format')
    return
  }
  if (kopie.art !== 'maschine') {
    setStatus('Zwischenablage enthält keine Maschinentabelle')
    return
  }
  const res = useStore.getState().einfuegenTabelle(kopie, { art: 'maschine', schrittId })
  setStatus(
    res.arbeitsplatzGeleert
      ? 'Tabelle eingefügt – Arbeitsplatz war belegt, bitte neu zuweisen'
      : 'Tabelle eingefügt',
  )
}

/** Fügt eine kopierte Nebentabelle in der Abteilung ein. */
export async function einfuegenNebentabelle(abteilungId: string): Promise<void> {
  const kopie = await ausZwischenablage()
  if (!kopie) {
    setStatus('Zwischenablage leer oder unbekanntes Format')
    return
  }
  if (kopie.art !== 'nebentabelle') {
    setStatus('Zwischenablage enthält keine Nebentabelle')
    return
  }
  const res = useStore.getState().einfuegenTabelle(kopie, { art: 'nebentabelle', abteilungId })
  setStatus(
    res.arbeitsplatzGeleert
      ? 'Tabelle eingefügt – Arbeitsplatz war belegt, bitte neu zuweisen'
      : 'Tabelle eingefügt',
  )
}
