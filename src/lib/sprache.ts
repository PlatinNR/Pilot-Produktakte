import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Sprache } from './i18n'
import { uebersetze } from './i18n'

interface SpracheState {
  sprache: Sprache
  setSprache: (sprache: Sprache) => void
}

/** Sprache der Oberfläche (Standard: Deutsch), wird im Browser gespeichert. */
export const useSprache = create<SpracheState>()(
  persist(
    (set) => ({
      sprache: 'de',
      setSprache: (sprache) => set({ sprache }),
    }),
    { name: 'produktakte-sprache' },
  ),
)

/** Übersetzungsfunktion für Komponenten: const t = useT(); t('Speichern') */
export function useT(): (text: string, werte?: Record<string, string | number>) => string {
  const sprache = useSprache((s) => s.sprache)
  return (text, werte) => uebersetze(text, sprache, werte)
}

/** Aktuelle Sprache (z. B. für spaltenName). */
export function useAktuelleSprache(): Sprache {
  return useSprache((s) => s.sprache)
}
