import { useEffect } from 'react'
import { useStore } from '../store'
import type { AppState } from '../types'

const MAX_EINTRAEGE = 50
const GRUPPE_MS = 600

type Snapshot = Pick<
  AppState,
  | 'chains'
  | 'activeChainId'
  | 'abteilungen'
  | 'bearbeitungsbloecke'
  | 'schritte'
  | 'produktionstabellen'
  | 'nebentabellen'
>

const stack: Snapshot[] = []
let letzterPush = 0
let unterdrueckt = false
let gestartet = false

function snapshot(s: Snapshot): Snapshot {
  return {
    chains: s.chains,
    activeChainId: s.activeChainId,
    abteilungen: s.abteilungen,
    bearbeitungsbloecke: s.bearbeitungsbloecke,
    schritte: s.schritte,
    produktionstabellen: s.produktionstabellen,
    nebentabellen: s.nebentabellen,
  }
}

function gleich(a: Snapshot, b: Snapshot): boolean {
  return (
    a.chains === b.chains &&
    a.activeChainId === b.activeChainId &&
    a.abteilungen === b.abteilungen &&
    a.bearbeitungsbloecke === b.bearbeitungsbloecke &&
    a.schritte === b.schritte &&
    a.produktionstabellen === b.produktionstabellen &&
    a.nebentabellen === b.nebentabellen
  )
}

/** Beobachtet Änderungen und legt Undo-Punkte an (gebündelt, damit Tippen einen Schritt ergibt). */
export function initUndo(): void {
  if (gestartet) return
  gestartet = true
  useStore.subscribe((state, prev) => {
    if (unterdrueckt) return
    if (gleich(state, prev)) return
    const jetzt = Date.now()
    if (jetzt - letzterPush > GRUPPE_MS) {
      stack.push(snapshot(prev))
      if (stack.length > MAX_EINTRAEGE) stack.shift()
    }
    letzterPush = jetzt
  })
}

/** Letzte Änderung zurücknehmen. */
export function undo(): boolean {
  const vorher = stack.pop()
  if (!vorher) return false
  unterdrueckt = true
  try {
    useStore.setState(snapshot(vorher))
  } finally {
    unterdrueckt = false
  }
  letzterPush = 0
  return true
}

export function kannUndo(): boolean {
  return stack.length > 0
}

/** Änderung ohne Undo-Punkt ausführen (z. B. Laden aus der Cloud). */
export function mitUnterdruecktemUndo<T>(fn: () => T): T {
  const alt = unterdrueckt
  unterdrueckt = true
  try {
    return fn()
  } finally {
    unterdrueckt = alt
  }
}

/** Strg+Z (bzw. Cmd+Z) nimmt die letzte Änderung zurück. */
export function useUndoShortcut(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.altKey) return
      if (e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
