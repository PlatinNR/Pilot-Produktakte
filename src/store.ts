import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Abteilung,
  AppState,
  Chain,
  ColumnType,
  KeyType,
  Nebentabelle,
  Produktionstabelle,
  Schritt,
  TableColumn,
  TableKey,
  TableRow,
} from './types'
import { NEBEN_SPALTEN, PRODUKTION_SPALTEN } from './types'

let counter = 0
function nextId(prefix = 'id'): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

function cloneSpalten(spalten: TableColumn[]): TableColumn[] {
  return spalten.map((s) => ({ ...s, id: s.fixed ? s.id : nextId('c') }))
}

function emptyRow(columns: TableColumn[]): TableRow {
  const row: TableRow = {}
  for (const c of columns) row[c.id] = ''
  return row
}

/** Standard-Fremdschlüssel einer Produktionstabelle: Auftragsnummer -> Schritt (Auftragsnummer) */
function produktionKeys(schrittId: string): TableKey[] {
  return [
    { id: nextId('k'), columnId: 'auftragsnummer', type: 'fk', refTableId: schrittId, refColumnId: 'auftragsnummer' },
  ]
}

/** Nebentabellen starten ohne automatische Verbindungen – werden manuell verknüpft */
function nebenKeys(): TableKey[] {
  return []
}

interface Store extends AppState {
  // Ketten
  addChain: (name?: string) => void
  renameChain: (id: string, name: string) => void
  removeChain: (id: string) => void
  setActiveChain: (id: string) => void

  // Abteilungen
  addAbteilung: (name?: string) => void
  renameAbteilung: (id: string, name: string) => void
  removeAbteilung: (id: string) => void

  // Schritte
  addSchritt: (abteilungId: string, name?: string) => void
  renameSchritt: (id: string, name: string) => void
  removeSchritt: (id: string) => void
  moveSchritt: (id: string, direction: 'up' | 'down') => void
  addColumnSchritt: (schrittId: string, name: string, type: ColumnType) => void
  renameColumnSchritt: (schrittId: string, spalteId: string, name: string) => void
  changeColumnTypeSchritt: (schrittId: string, spalteId: string, type: ColumnType) => void
  removeColumnSchritt: (schrittId: string, spalteId: string) => void
  setColumnKeySchritt: (schrittId: string, spalteId: string, keyType: KeyType | null) => void
  linkSchrittFK: (schrittId: string, spalteId: string, refTableId: string, refColumnId: string) => void
  setKeyLabelSchritt: (schrittId: string, spalteId: string, label: string) => void

  // Produktionstabellen (Maschinen)
  addProduktionstabelle: (schrittId: string, name?: string) => void
  renameProduktionstabelle: (id: string, name: string) => void
  removeProduktionstabelle: (id: string) => void
  addColumnProduktion: (tabelleId: string, name: string, type: ColumnType) => void
  renameColumnProduktion: (tabelleId: string, spalteId: string, name: string) => void
  changeColumnTypeProduktion: (tabelleId: string, spalteId: string, type: ColumnType) => void
  removeColumnProduktion: (tabelleId: string, spalteId: string) => void
  addRowProduktion: (tabelleId: string) => void
  updateCellProduktion: (tabelleId: string, rowIndex: number, spalteId: string, value: string) => void
  removeRowProduktion: (tabelleId: string, rowIndex: number) => void
  setColumnKeyProduktion: (tabelleId: string, spalteId: string, keyType: KeyType | null) => void
  linkProduktionFK: (tabelleId: string, spalteId: string, refTableId: string, refColumnId: string) => void
  setKeyLabelProduktion: (tabelleId: string, spalteId: string, label: string) => void

  // Nebentabellen
  addNebentabelle: (abteilungId: string, name?: string) => void
  renameNebentabelle: (id: string, name: string) => void
  removeNebentabelle: (id: string) => void
  addColumnNeben: (tabelleId: string, name: string, type: ColumnType) => void
  renameColumnNeben: (tabelleId: string, spalteId: string, name: string) => void
  changeColumnTypeNeben: (tabelleId: string, spalteId: string, type: ColumnType) => void
  removeColumnNeben: (tabelleId: string, spalteId: string) => void
  addRowNeben: (tabelleId: string) => void
  updateCellNeben: (tabelleId: string, rowIndex: number, spalteId: string, value: string) => void
  removeRowNeben: (tabelleId: string, rowIndex: number) => void
  setColumnKeyNeben: (tabelleId: string, spalteId: string, keyType: KeyType | null) => void
  linkNebenFK: (tabelleId: string, spalteId: string, refTableId: string, refColumnId: string) => void
  setKeyLabelNeben: (tabelleId: string, spalteId: string, label: string) => void
}

function addColumn(columns: TableColumn[], name: string, type: ColumnType): TableColumn[] {
  return [...columns, { id: nextId('c'), name, type, fixed: false }]
}

// seed() ist eine Funktionsdeklaration und wird gehoisted – Demo als Standard-Zustand
const demo = seed()

export const useStore = create<Store>()(
  persist(
    (set) => ({
      chains: demo.chains,
      activeChainId: demo.activeChainId,
      abteilungen: demo.abteilungen,
      schritte: demo.schritte,
      produktionstabellen: demo.produktionstabellen,
      nebentabellen: demo.nebentabellen,

      // --- Ketten ---
      addChain: (name) =>
        set((s) => {
          const id = nextId('chain')
          return {
            chains: [...s.chains, { id, name: name ?? `Kette ${s.chains.length + 1}` }],
            activeChainId: id,
          }
        }),

      renameChain: (id, name) =>
        set((s) => ({ chains: s.chains.map((c) => (c.id === id ? { ...c, name } : c)) })),

      removeChain: (id) =>
        set((s) => {
          const abteilungen = s.abteilungen.filter((a) => a.chainId !== id)
          const abteilungIds = new Set(abteilungen.map((a) => a.id))
          const schritte = s.schritte.filter((st) => abteilungIds.has(st.abteilungId))
          const schrittIds = new Set(schritte.map((st) => st.id))
          return {
            chains: s.chains.filter((c) => c.id !== id),
            activeChainId: s.activeChainId === id ? (s.chains.find((c) => c.id !== id)?.id ?? '') : s.activeChainId,
            abteilungen,
            schritte,
            nebentabellen: s.nebentabellen.filter((n) => abteilungIds.has(n.abteilungId)),
            produktionstabellen: s.produktionstabellen.filter((t) => schrittIds.has(t.schrittId)),
          }
        }),

      setActiveChain: (id) => set({ activeChainId: id }),

      // --- Abteilungen ---
      addAbteilung: (name) =>
        set((s) => ({
          abteilungen: [
            ...s.abteilungen,
            { id: nextId('a'), chainId: s.activeChainId, name: name ?? 'Neue Abteilung' },
          ],
        })),

  renameAbteilung: (id, name) =>
    set((s) => ({ abteilungen: s.abteilungen.map((a) => (a.id === id ? { ...a, name } : a)) })),

  removeAbteilung: (id) =>
    set((s) => ({
      abteilungen: s.abteilungen.filter((a) => a.id !== id),
      schritte: s.schritte.filter((st) => st.abteilungId !== id),
      nebentabellen: s.nebentabellen.filter((n) => n.abteilungId !== id),
      produktionstabellen: s.produktionstabellen.filter(
        (t) => !s.schritte.some((st) => st.abteilungId === id && st.id === t.schrittId),
      ),
    })),

  // --- Schritte ---
  addSchritt: (abteilungId, name) =>
    set((s) => ({
      schritte: [
        ...s.schritte,
        {
          id: nextId('s'),
          abteilungId,
          name: name ?? `Schritt ${s.schritte.length + 1}`,
          columns: [],
          keys: [],
        },
      ],
    })),

  renameSchritt: (id, name) =>
    set((s) => ({ schritte: s.schritte.map((st) => (st.id === id ? { ...st, name } : st)) })),

  removeSchritt: (id) =>
    set((s) => ({
      schritte: s.schritte.filter((st) => st.id !== id),
      produktionstabellen: s.produktionstabellen.filter((t) => t.schrittId !== id),
    })),

  addColumnSchritt: (schrittId, name, type) =>
    set((s) => ({
      schritte: s.schritte.map((st) =>
        st.id === schrittId ? { ...st, columns: [...st.columns, { id: nextId('c'), name, type, fixed: false }] } : st,
      ),
    })),

  renameColumnSchritt: (schrittId, spalteId, name) =>
    set((s) => ({
      schritte: s.schritte.map((st) =>
        st.id === schrittId
          ? { ...st, columns: st.columns.map((c) => (c.id === spalteId ? { ...c, name } : c)) }
          : st,
      ),
    })),

  changeColumnTypeSchritt: (schrittId, spalteId, type) =>
    set((s) => ({
      schritte: s.schritte.map((st) =>
        st.id === schrittId
          ? { ...st, columns: st.columns.map((c) => (c.id === spalteId ? { ...c, type } : c)) }
          : st,
      ),
    })),

  removeColumnSchritt: (schrittId, spalteId) =>
    set((s) => ({
      schritte: s.schritte.map((st) =>
        st.id === schrittId
          ? {
              ...st,
              columns: st.columns.filter((c) => c.id !== spalteId),
              keys: st.keys.filter((k) => k.columnId !== spalteId),
            }
          : st,
      ),
    })),

  setColumnKeySchritt: (schrittId, spalteId, keyType) =>
    set((s) => ({
      schritte: s.schritte.map((st) => {
        if (st.id !== schrittId) return st
        const keys = st.keys.filter((k) => k.columnId !== spalteId)
        if (keyType) {
          keys.push({
            id: nextId('k'),
            columnId: spalteId,
            type: keyType,
            refTableId: keyType === 'fk' ? st.abteilungId : null,
            refColumnId: keyType === 'fk' ? 'auftragsnummer' : null,
          })
        }
        return { ...st, keys }
      }),
    })),

  linkSchrittFK: (schrittId, spalteId, refTableId, refColumnId) =>
    set((s) => ({
      schritte: s.schritte.map((st) => {
        if (st.id !== schrittId) return st
        const keys = st.keys.filter((k) => k.columnId !== spalteId)
        keys.push({ id: nextId('k'), columnId: spalteId, type: 'fk', refTableId, refColumnId })
        return { ...st, keys }
      }),
    })),

  setKeyLabelSchritt: (schrittId, spalteId, label) =>
    set((s) => ({
      schritte: s.schritte.map((st) =>
        st.id === schrittId
          ? { ...st, keys: st.keys.map((k) => (k.columnId === spalteId ? { ...k, label } : k)) }
          : st,
      ),
    })),

  moveSchritt: (id, direction) =>
    set((s) => {
      const schritt = s.schritte.find((st) => st.id === id)
      if (!schritt) return s
      const siblings = s.schritte
        .map((st, i) => ({ st, i }))
        .filter((x) => x.st.abteilungId === schritt.abteilungId)
      const idx = siblings.findIndex((x) => x.st.id === id)
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= siblings.length) return s
      const schritte = [...s.schritte]
      const a = siblings[idx].i
      const b = siblings[target].i
      ;[schritte[a], schritte[b]] = [schritte[b], schritte[a]]
      return { schritte }
    }),

  // --- Produktionstabellen ---
  addProduktionstabelle: (schrittId, name) =>
    set((s) => ({
      produktionstabellen: [
        ...s.produktionstabellen,
        {
          id: nextId('p'),
          schrittId,
          name: name ?? 'Neue Maschine',
          columns: cloneSpalten(PRODUKTION_SPALTEN),
          rows: [],
          keys: produktionKeys(schrittId),
        },
      ],
    })),

  renameProduktionstabelle: (id, name) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) => (t.id === id ? { ...t, name } : t)),
    })),

  removeProduktionstabelle: (id) =>
    set((s) => ({ produktionstabellen: s.produktionstabellen.filter((t) => t.id !== id) })),

  addColumnProduktion: (tabelleId, name, type) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) =>
        t.id === tabelleId ? { ...t, columns: addColumn(t.columns, name, type) } : t,
      ),
    })),

  renameColumnProduktion: (tabelleId, spalteId, name) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) =>
        t.id === tabelleId
          ? {
              ...t,
              columns: t.columns.map((c) => (c.id === spalteId && !c.fixed ? { ...c, name } : c)),
            }
          : t,
      ),
    })),

  changeColumnTypeProduktion: (tabelleId, spalteId, type) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) =>
        t.id === tabelleId
          ? {
              ...t,
              columns: t.columns.map((c) => (c.id === spalteId && !c.fixed ? { ...c, type } : c)),
            }
          : t,
      ),
    })),

  removeColumnProduktion: (tabelleId, spalteId) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) =>
        t.id === tabelleId
          ? {
              ...t,
              columns: t.columns.filter((c) => c.id !== spalteId || c.fixed),
              rows: t.rows.map((r) => {
                const copy = { ...r }
                delete copy[spalteId]
                return copy
              }),
            }
          : t,
      ),
    })),

  addRowProduktion: (tabelleId) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) =>
        t.id === tabelleId ? { ...t, rows: [...t.rows, emptyRow(t.columns)] } : t,
      ),
    })),

  updateCellProduktion: (tabelleId, rowIndex, spalteId, value) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) =>
        t.id === tabelleId
          ? {
              ...t,
              rows: t.rows.map((r, i) => (i === rowIndex ? { ...r, [spalteId]: value } : r)),
            }
          : t,
      ),
    })),

  removeRowProduktion: (tabelleId, rowIndex) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) =>
        t.id === tabelleId ? { ...t, rows: t.rows.filter((_, i) => i !== rowIndex) } : t,
      ),
    })),

  setColumnKeyProduktion: (tabelleId, spalteId, keyType) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) => {
        if (t.id !== tabelleId) return t
        const keys = t.keys.filter((k) => k.columnId !== spalteId)
        if (keyType) {
          keys.push({
            id: nextId('k'),
            columnId: spalteId,
            type: keyType,
            refTableId: keyType === 'fk' ? t.schrittId : null,
            refColumnId: keyType === 'fk' ? 'auftragsnummer' : null,
          })
        }
        return { ...t, keys }
      }),
    })),

  linkProduktionFK: (tabelleId, spalteId, refTableId, refColumnId) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) => {
        if (t.id !== tabelleId) return t
        const keys = t.keys.filter((k) => k.columnId !== spalteId)
        keys.push({ id: nextId('k'), columnId: spalteId, type: 'fk', refTableId, refColumnId })
        return { ...t, keys }
      }),
    })),

  setKeyLabelProduktion: (tabelleId, spalteId, label) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) =>
        t.id === tabelleId
          ? { ...t, keys: t.keys.map((k) => (k.columnId === spalteId ? { ...k, label } : k)) }
          : t,
      ),
    })),

  // --- Nebentabellen ---
  addNebentabelle: (abteilungId, name) =>
    set((s) => ({
      nebentabellen: [
        ...s.nebentabellen,
        {
          id: nextId('n'),
          abteilungId,
          name: name ?? 'Neue Nebentabelle',
          columns: cloneSpalten(NEBEN_SPALTEN),
          rows: [],
          keys: nebenKeys(),
        },
      ],
    })),

  renameNebentabelle: (id, name) =>
    set((s) => ({ nebentabellen: s.nebentabellen.map((t) => (t.id === id ? { ...t, name } : t)) })),

  removeNebentabelle: (id) =>
    set((s) => ({ nebentabellen: s.nebentabellen.filter((t) => t.id !== id) })),

  addColumnNeben: (tabelleId, name, type) =>
    set((s) => ({
      nebentabellen: s.nebentabellen.map((t) =>
        t.id === tabelleId ? { ...t, columns: addColumn(t.columns, name, type) } : t,
      ),
    })),

  renameColumnNeben: (tabelleId, spalteId, name) =>
    set((s) => ({
      nebentabellen: s.nebentabellen.map((t) =>
        t.id === tabelleId
          ? {
              ...t,
              columns: t.columns.map((c) => (c.id === spalteId && !c.fixed ? { ...c, name } : c)),
            }
          : t,
      ),
    })),

  changeColumnTypeNeben: (tabelleId, spalteId, type) =>
    set((s) => ({
      nebentabellen: s.nebentabellen.map((t) =>
        t.id === tabelleId
          ? {
              ...t,
              columns: t.columns.map((c) => (c.id === spalteId && !c.fixed ? { ...c, type } : c)),
            }
          : t,
      ),
    })),

  removeColumnNeben: (tabelleId, spalteId) =>
    set((s) => ({
      nebentabellen: s.nebentabellen.map((t) =>
        t.id === tabelleId
          ? {
              ...t,
              columns: t.columns.filter((c) => c.id !== spalteId || c.fixed),
              rows: t.rows.map((r) => {
                const copy = { ...r }
                delete copy[spalteId]
                return copy
              }),
            }
          : t,
      ),
    })),

  addRowNeben: (tabelleId) =>
    set((s) => ({
      nebentabellen: s.nebentabellen.map((t) =>
        t.id === tabelleId ? { ...t, rows: [...t.rows, emptyRow(t.columns)] } : t,
      ),
    })),

  updateCellNeben: (tabelleId, rowIndex, spalteId, value) =>
    set((s) => ({
      nebentabellen: s.nebentabellen.map((t) =>
        t.id === tabelleId
          ? {
              ...t,
              rows: t.rows.map((r, i) => (i === rowIndex ? { ...r, [spalteId]: value } : r)),
            }
          : t,
      ),
    })),

  removeRowNeben: (tabelleId, rowIndex) =>
    set((s) => ({
      nebentabellen: s.nebentabellen.map((t) =>
        t.id === tabelleId ? { ...t, rows: t.rows.filter((_, i) => i !== rowIndex) } : t,
      ),
    })),

  setColumnKeyNeben: (tabelleId, spalteId, keyType) =>
    set((s) => ({
      nebentabellen: s.nebentabellen.map((t) => {
        if (t.id !== tabelleId) return t
        const keys = t.keys.filter((k) => k.columnId !== spalteId)
        if (keyType) {
          keys.push({
            id: nextId('k'),
            columnId: spalteId,
            type: keyType,
            refTableId: keyType === 'fk' ? t.abteilungId : null,
            refColumnId: keyType === 'fk' ? 'datum' : null,
          })
        }
        return { ...t, keys }
      }),
    })),

  linkNebenFK: (tabelleId, spalteId, refTableId, refColumnId) =>
    set((s) => ({
      nebentabellen: s.nebentabellen.map((t) => {
        if (t.id !== tabelleId) return t
        const keys = t.keys.filter((k) => k.columnId !== spalteId)
        keys.push({ id: nextId('k'), columnId: spalteId, type: 'fk', refTableId, refColumnId })
        return { ...t, keys }
      }),
    })),

  setKeyLabelNeben: (tabelleId, spalteId, label) =>
    set((s) => ({
      nebentabellen: s.nebentabellen.map((t) =>
        t.id === tabelleId
          ? { ...t, keys: t.keys.map((k) => (k.columnId === spalteId ? { ...k, label } : k)) }
          : t,
      ),
    })),
    }),
    {
      name: 'digitale-produktakte',
      version: 2,
      migrate: (persisted, version) => {
        const p = persisted as Partial<AppState> & {
          abteilungen?: (Abteilung & { chainId?: string })[]
        }
        if (version < 2) {
          return {
            ...p,
            chains: p.chains && p.chains.length > 0 ? p.chains : [{ id: 'chain-test', name: 'Testkette' }],
            activeChainId: p.activeChainId || 'chain-test',
            abteilungen: (p.abteilungen ?? []).map((a) => ({ ...a, chainId: a.chainId ?? 'chain-test' })),
          } as AppState
        }
        return persisted as AppState
      },
      partialize: (s) => ({
        chains: s.chains,
        activeChainId: s.activeChainId,
        abteilungen: s.abteilungen,
        schritte: s.schritte,
        produktionstabellen: s.produktionstabellen,
        nebentabellen: s.nebentabellen,
      }),
    },
  ),
)

// --- Demo-Daten (Wachs: Spritzen / Modellieren / Reinigen, je 4 Maschinen) ---

function seed(): AppState {
  const chains: Chain[] = [{ id: 'chain-test', name: 'Testkette' }]
  const activeChainId = 'chain-test'

  const abteilungen: Abteilung[] = [{ id: 'abt-wachs', chainId: 'chain-test', name: 'Wachs' }]

  const schritte: Schritt[] = [
    { id: 's-spritzen', abteilungId: 'abt-wachs', name: '1. Spritzen', columns: [], keys: [] },
    { id: 's-modellieren', abteilungId: 'abt-wachs', name: '2. Modellieren', columns: [], keys: [] },
    { id: 's-reinigen', abteilungId: 'abt-wachs', name: '3. Reinigen', columns: [], keys: [] },
  ]

  const druckSpalte: TableColumn = { id: 'c-druck', name: 'Druck (bar)', type: 'number', fixed: false }

  const produktionstabellen: Produktionstabelle[] = []
  const schrittMachineNames: Record<string, string[]> = {
    's-spritzen': ['Wachsspritzmaschine 1', 'Wachsspritzmaschine 2', 'Wachsspritzmaschine 3', 'Wachsspritzmaschine 4'],
    's-modellieren': ['Modelliermaschine 1', 'Modelliermaschine 2', 'Modelliermaschine 3', 'Modelliermaschine 4'],
    's-reinigen': ['Reinigungsmaschine 1', 'Reinigungsmaschine 2', 'Reinigungsmaschine 3', 'Reinigungsmaschine 4'],
  }

  for (const s of schritte) {
    const names = schrittMachineNames[s.id]
    for (let i = 0; i < names.length; i++) {
      produktionstabellen.push({
        id: `p-${s.id}-${i + 1}`,
        schrittId: s.id,
        name: names[i],
        columns: [...cloneSpalten(PRODUKTION_SPALTEN), { ...druckSpalte, id: `c-druck-${s.id}-${i + 1}` }],
        rows: [],
        keys: [
          {
            id: `k-${s.id}-${i + 1}`,
            columnId: 'auftragsnummer',
            type: 'fk',
            refTableId: s.id,
            refColumnId: 'auftragsnummer',
          },
        ],
      })
    }
  }

  // Vereinfachte, korrekte Zuordnung der Demo-Zeilen:
  const assign = (schrittId: string, maschinenIndex: number, rows: TableRow[]) => {
    const t = produktionstabellen.find(
      (p) => p.schrittId === schrittId && p.id.endsWith(`-${maschinenIndex}`),
    )
    if (t) t.rows = rows
  }

  assign('s-spritzen', 1, [
    { auftragsnummer: 'AUF-1001', fn: 'F-100', datum: '2026-08-26', 'c-druck-s-spritzen-1': '52' },
    { auftragsnummer: 'AUF-1003', fn: 'F-200', datum: '2026-08-26', 'c-druck-s-spritzen-1': '55' },
    { auftragsnummer: 'AUF-1004', fn: 'F-200', datum: '2026-08-26', 'c-druck-s-spritzen-1': '54' },
  ])
  assign('s-spritzen', 2, [
    { auftragsnummer: 'AUF-1002', fn: 'F-100', datum: '2026-08-26', 'c-druck-s-spritzen-2': '51' },
    { auftragsnummer: 'AUF-1005', fn: 'F-200', datum: '2026-08-26', 'c-druck-s-spritzen-2': '53' },
  ])
  assign('s-spritzen', 3, [
    { auftragsnummer: 'AUF-1006', fn: 'F-300', datum: '2026-08-27', 'c-druck-s-spritzen-3': '50' },
  ])
  assign('s-modellieren', 1, [{ auftragsnummer: 'AUF-1002', fn: 'F-100', datum: '2026-08-26' }])
  assign('s-modellieren', 2, [
    { auftragsnummer: 'AUF-1001', fn: 'F-100', datum: '2026-08-26' },
    { auftragsnummer: 'AUF-1004', fn: 'F-200', datum: '2026-08-26' },
    { auftragsnummer: 'AUF-1005', fn: 'F-200', datum: '2026-08-26' },
  ])
  assign('s-modellieren', 3, [
    { auftragsnummer: 'AUF-1003', fn: 'F-200', datum: '2026-08-26' },
    { auftragsnummer: 'AUF-1006', fn: 'F-300', datum: '2026-08-27' },
  ])
  assign('s-reinigen', 1, [
    { auftragsnummer: 'AUF-1001', fn: 'F-100', datum: '2026-08-26' },
    { auftragsnummer: 'AUF-1004', fn: 'F-200', datum: '2026-08-26' },
    { auftragsnummer: 'AUF-1005', fn: 'F-200', datum: '2026-08-26' },
  ])
  assign('s-reinigen', 2, [{ auftragsnummer: 'AUF-1002', fn: 'F-100', datum: '2026-08-26' }])
  assign('s-reinigen', 3, [
    { auftragsnummer: 'AUF-1003', fn: 'F-200', datum: '2026-08-26' },
    { auftragsnummer: 'AUF-1006', fn: 'F-300', datum: '2026-08-27' },
  ])

  const nebentabellen: Nebentabelle[] = [
    {
      id: 'n-wachsqualitaet',
      abteilungId: 'abt-wachs',
      name: 'Wachsqualität',
      columns: [...cloneSpalten(NEBEN_SPALTEN), { id: 'c-qual', name: 'Qualitätswert', type: 'number', fixed: false }],
      rows: [
        { datum: '2026-08-26', 'c-qual': '98' },
        { datum: '2026-08-27', 'c-qual': '87' },
      ],
      keys: [],
    },
  ]

  return { chains, activeChainId, abteilungen, schritte, produktionstabellen, nebentabellen }
}
