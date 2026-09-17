import { useEffect, useRef, useSyncExternalStore } from 'react'
import { isSupabaseConfigured } from './supabase'
import { listChains, saveChain } from './api'
import { useStore } from '../store'
import type { Abteilung, Bearbeitungsblock, ChainData, Nebentabelle, Produktionstabelle, Schritt } from '../types'

const updatedAtMap = new Map<string, string>()

export interface SyncStatus {
  phase: 'idle' | 'loading' | 'saving'
  cloudChecked: boolean
  cloudEmpty: boolean
  lastError: string | null
  lastSavedAt: number | null
}

let status: SyncStatus = {
  phase: 'idle',
  cloudChecked: false,
  cloudEmpty: false,
  lastError: null,
  lastSavedAt: null,
}

const listeners = new Set<() => void>()

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch }
  for (const l of listeners) l()
}

function errorText(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object') {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const parts = [o.message, o.details, o.hint, o.code ? `Code ${o.code}` : null].filter(
      (x): x is string => typeof x === 'string' && x.length > 0,
    )
    if (parts.length > 0) return parts.join(' · ')
  }
  return String(e)
}

/** Reaktiver Sync-Status für die Oberfläche. */
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}

function extractChainData(chainId: string): ChainData {
  const s = useStore.getState()
  const abteilungen = s.abteilungen.filter((a) => a.chainId === chainId)
  const abteilungIds = new Set(abteilungen.map((a) => a.id))
  const bearbeitungsbloecke = s.bearbeitungsbloecke.filter((b) => abteilungIds.has(b.abteilungId))
  const schritte = s.schritte.filter((st) => abteilungIds.has(st.abteilungId))
  const schrittIds = new Set(schritte.map((st) => st.id))
  const produktionstabellen = s.produktionstabellen.filter((t) => schrittIds.has(t.schrittId))
  const nebentabellen = s.nebentabellen.filter((n) => abteilungIds.has(n.abteilungId))
  return { abteilungen, bearbeitungsbloecke, schritte, produktionstabellen, nebentabellen }
}

export function hasLocalData(): boolean {
  const s = useStore.getState()
  return s.chains.length > 0 && (s.abteilungen.length > 0 || s.schritte.length > 0)
}

/** Lädt die lokalen Daten hoch (aktive Kette zuerst, damit sie die Standard-Kette wird). */
export async function saveAllChains(): Promise<void> {
  if (!isSupabaseConfigured()) {
    setStatus({ lastError: 'Supabase ist nicht konfiguriert (Umgebungsvariablen fehlen).' })
    return
  }
  setStatus({ phase: 'saving', lastError: null })
  try {
    const s = useStore.getState()
    const ordered = [...s.chains].sort((a, b) =>
      a.id === s.activeChainId ? -1 : b.id === s.activeChainId ? 1 : 0,
    )
    for (const chain of ordered) {
      const data = extractChainData(chain.id)
      const res = await saveChain(chain.id, chain.name, data, updatedAtMap.get(chain.id) ?? null)
      if (res.updatedAt) updatedAtMap.set(chain.id, res.updatedAt)
    }
    setStatus({ phase: 'idle', cloudChecked: true, cloudEmpty: false, lastSavedAt: Date.now() })
  } catch (e) {
    setStatus({ phase: 'idle', lastError: errorText(e) })
  }
}

/** Holt den Stand aus der Cloud und ersetzt damit die lokalen Daten. */
export async function loadFromCloud(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    setStatus({ lastError: 'Supabase ist nicht konfiguriert (Umgebungsvariablen fehlen).' })
    return false
  }
  setStatus({ phase: 'loading', lastError: null })
  try {
    const records = await listChains()
    setStatus({ cloudChecked: true, cloudEmpty: records.length === 0 })
    if (records.length === 0) {
      setStatus({ phase: 'idle' })
      return false
    }
    const chains = records.map((r) => ({ id: r.id, name: r.name }))
    const abteilungen: Abteilung[] = []
    const bearbeitungsbloecke: Bearbeitungsblock[] = []
    const schritte: Schritt[] = []
    const produktionstabellen: Produktionstabelle[] = []
    const nebentabellen: Nebentabelle[] = []
    for (const r of records) {
      const d = r.data ?? {
        abteilungen: [],
        bearbeitungsbloecke: [],
        schritte: [],
        produktionstabellen: [],
        nebentabellen: [],
      }
      for (const a of d.abteilungen ?? []) abteilungen.push({ ...a, chainId: r.id })
      for (const b of d.bearbeitungsbloecke ?? []) bearbeitungsbloecke.push(b)
      for (const st of d.schritte ?? []) schritte.push(st)
      for (const p of d.produktionstabellen ?? []) produktionstabellen.push(p)
      for (const n of d.nebentabellen ?? []) nebentabellen.push(n)
      updatedAtMap.set(r.id, r.updated_at)
    }
    const state = useStore.getState()
    useStore.setState({
      chains,
      activeChainId:
        chains.length > 0
          ? chains.some((c) => c.id === state.activeChainId)
            ? state.activeChainId
            : chains[0].id
          : '',
      abteilungen,
      bearbeitungsbloecke,
      schritte,
      produktionstabellen,
      nebentabellen,
    })
    setStatus({ phase: 'idle' })
    return true
  } catch (e) {
    setStatus({ phase: 'idle', lastError: errorText(e) })
    return false
  }
}

export function useSupabaseSync() {
  const loadingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ketten laden
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let cancelled = false
    loadingRef.current = true
    loadFromCloud()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) loadingRef.current = false
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Debounce-Speichern aller Ketten
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const unsubscribe = useStore.subscribe((state, prevState) => {
      if (loadingRef.current) return
      if (
        state.chains === prevState.chains &&
        state.activeChainId === prevState.activeChainId &&
        state.abteilungen === prevState.abteilungen &&
        state.bearbeitungsbloecke === prevState.bearbeitungsbloecke &&
        state.schritte === prevState.schritte &&
        state.produktionstabellen === prevState.produktionstabellen &&
        state.nebentabellen === prevState.nebentabellen
      ) {
        return
      }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        saveAllChains()
      }, 800)
    })

    return () => {
      unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])
}
