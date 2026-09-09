import { useEffect, useRef } from 'react'
import { isSupabaseConfigured } from './supabase'
import { listChains, saveChain } from './api'
import { useStore } from '../store'
import type { Abteilung, ChainData, Nebentabelle, Produktionstabelle, Schritt } from '../types'
import type { Mode } from './auth'

function extractChainData(chainId: string): ChainData {
  const s = useStore.getState()
  const abteilungen = s.abteilungen.filter((a) => a.chainId === chainId)
  const abteilungIds = new Set(abteilungen.map((a) => a.id))
  const schritte = s.schritte.filter((st) => abteilungIds.has(st.abteilungId))
  const schrittIds = new Set(schritte.map((st) => st.id))
  const produktionstabellen = s.produktionstabellen.filter((t) => schrittIds.has(t.schrittId))
  const nebentabellen = s.nebentabellen.filter((n) => abteilungIds.has(n.abteilungId))
  return { abteilungen, schritte, produktionstabellen, nebentabellen }
}

export function useSupabaseSync(mode: Mode) {
  const updatedAtRef = useRef<Record<string, string>>({})
  const loadingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ketten laden (Admin und Gast)
  useEffect(() => {
    if (mode !== 'admin' && mode !== 'guest') return
    if (!isSupabaseConfigured()) return
    let cancelled = false
    loadingRef.current = true
    listChains()
      .then((records) => {
        if (cancelled) return
        const chains = records.map((r) => ({ id: r.id, name: r.name }))
        const abteilungen: Abteilung[] = []
        const schritte: Schritt[] = []
        const produktionstabellen: Produktionstabelle[] = []
        const nebentabellen: Nebentabelle[] = []
        for (const r of records) {
          const d = r.data ?? { abteilungen: [], schritte: [], produktionstabellen: [], nebentabellen: [] }
          for (const a of d.abteilungen ?? []) abteilungen.push({ ...a, chainId: r.id })
          for (const st of d.schritte ?? []) schritte.push(st)
          for (const p of d.produktionstabellen ?? []) produktionstabellen.push(p)
          for (const n of d.nebentabellen ?? []) nebentabellen.push(n)
          updatedAtRef.current[r.id] = r.updated_at
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
          schritte,
          produktionstabellen,
          nebentabellen,
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) loadingRef.current = false
      })
    return () => {
      cancelled = true
    }
  }, [mode])

  // Debounce-Speichern der aktiven Kette (nur Admin)
  useEffect(() => {
    if (mode !== 'admin' || !isSupabaseConfigured()) return

    const saveActive = () => {
      const s = useStore.getState()
      const chainId = s.activeChainId
      if (!chainId) return
      const chain = s.chains.find((c) => c.id === chainId)
      if (!chain) return
      const data = extractChainData(chainId)
      saveChain(chainId, chain.name, data, updatedAtRef.current[chainId] ?? null)
        .then((res) => {
          if (res.updatedAt) updatedAtRef.current[chainId] = res.updatedAt
        })
        .catch(() => {})
    }

    const unsubscribe = useStore.subscribe((state, prevState) => {
      if (loadingRef.current) return
      if (
        state.chains === prevState.chains &&
        state.activeChainId === prevState.activeChainId &&
        state.abteilungen === prevState.abteilungen &&
        state.schritte === prevState.schritte &&
        state.produktionstabellen === prevState.produktionstabellen &&
        state.nebentabellen === prevState.nebentabellen
      ) {
        return
      }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(saveActive, 800)
    })

    return () => {
      unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [mode])
}
