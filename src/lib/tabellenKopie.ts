import { useSyncExternalStore } from 'react'
import { useStore } from '../store'
import { uebersetze } from './i18n'
import { useSprache } from './sprache'

/** Übersetzt mit der aktuell eingestellten Sprache. */
const tt = (text: string, werte?: Record<string, string | number>) =>
  uebersetze(text, useSprache.getState().sprache, werte)
import type { AbteilungKopie, TabellenKopie } from '../types'

let status: string | null = null
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | null = null
/** Fallback, wenn der Browser keinen Zwischenablage-Zugriff erlaubt */
let interneAblage: { typ?: string } | null = null

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

async function inZwischenablage(kopie: { typ: string }): Promise<boolean> {
  interneAblage = kopie
  try {
    await navigator.clipboard.writeText(JSON.stringify(kopie))
    return true
  } catch {
    return false
  }
}

async function ausZwischenablage<T extends { typ: string }>(typ: string): Promise<T | null> {
  let daten: { typ?: string } | null = null
  try {
    const text = await navigator.clipboard.readText()
    daten = JSON.parse(text)
  } catch {
    daten = interneAblage
  }
  if (daten && daten.typ === typ) return daten as T
  return null
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
  setStatus(ok ? tt('{name} kopiert', { name: t.name }) : tt('{name} kopiert (App-Ablage)', { name: t.name }))
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
  setStatus(ok ? tt('{name} kopiert', { name: t.name }) : tt('{name} kopiert (App-Ablage)', { name: t.name }))
}

/** Fügt eine kopierte Maschinentabelle am Schritt ein. */
export async function einfuegenMaschine(schrittId: string): Promise<void> {
  const kopie = await ausZwischenablage<TabellenKopie>('produktakte-tabelle')
  if (!kopie) {
    setStatus(tt('Zwischenablage leer oder unbekanntes Format'))
    return
  }
  if (kopie.art !== 'maschine') {
    setStatus(tt('Zwischenablage enthält keine Maschinentabelle'))
    return
  }
  const res = useStore.getState().einfuegenTabelle(kopie, { art: 'maschine', schrittId })
  setStatus(
    res.arbeitsplatzGeleert
      ? tt('Tabelle eingefügt – Arbeitsplatz war belegt, bitte neu zuweisen')
      : tt('Tabelle eingefügt'),
  )
}

/** Fügt eine kopierte Nebentabelle in der Abteilung ein. */
export async function einfuegenNebentabelle(abteilungId: string): Promise<void> {
  const kopie = await ausZwischenablage<TabellenKopie>('produktakte-tabelle')
  if (!kopie) {
    setStatus(tt('Zwischenablage leer oder unbekanntes Format'))
    return
  }
  if (kopie.art !== 'nebentabelle') {
    setStatus(tt('Zwischenablage enthält keine Nebentabelle'))
    return
  }
  const res = useStore.getState().einfuegenTabelle(kopie, { art: 'nebentabelle', abteilungId })
  setStatus(
    res.arbeitsplatzGeleert
      ? tt('Tabelle eingefügt – Arbeitsplatz war belegt, bitte neu zuweisen')
      : tt('Tabelle eingefügt'),
  )
}

/** Kopiert eine Abteilung samt Schritten, Blöcken, Arbeitsplätzen und Unterstützungsprozessen. */
export async function kopiereAbteilung(abteilungId: string): Promise<void> {
  const s = useStore.getState()
  const abteilung = s.abteilungen.find((a) => a.id === abteilungId)
  if (!abteilung) return
  const kopie: AbteilungKopie = {
    typ: 'produktakte-abteilung',
    version: 1,
    name: abteilung.name,
    info: abteilung.info,
    bloecke: s.bearbeitungsbloecke.filter((b) => b.abteilungId === abteilungId),
    schritte: s.schritte.filter((st) => st.abteilungId === abteilungId),
    produktionstabellen: s.produktionstabellen.filter((t) =>
      s.schritte.some((st) => st.abteilungId === abteilungId && st.id === t.schrittId),
    ),
    nebentabellen: s.nebentabellen.filter((n) => n.abteilungId === abteilungId),
  }
  const ok = await inZwischenablage(kopie)
  setStatus(
    ok ? tt('Abteilung „{name}" kopiert', { name: abteilung.name }) : tt('Abteilung „{name}" kopiert (App-Ablage)', { name: abteilung.name }),
  )
}

/** Fügt eine kopierte Abteilung in die aktive Kette ein. */
export async function fuegeAbteilungEin(chainId: string): Promise<void> {
  const kopie = await ausZwischenablage<AbteilungKopie>('produktakte-abteilung')
  if (!kopie) {
    setStatus(tt('Zwischenablage enthält keine kopierte Abteilung'))
    return
  }
  const res = useStore.getState().fuegeAbteilungEin(chainId, kopie)
  setStatus(
    res.arbeitsplatzGeleert
      ? tt('Abteilung „{name}" eingefügt – Arbeitsplatznummern waren belegt, bitte neu zuweisen', { name: kopie.name })
      : tt('Abteilung „{name}" eingefügt', { name: kopie.name }),
  )
}
