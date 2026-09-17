import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Abteilung,
  AppState,
  Bearbeitungsblock,
  Chain,
  ColumnType,
  InfoBereich,
  InfoFeld,
  KeyType,
  Nebentabelle,
  Produktionstabelle,
  Schritt,
  TableColumn,
  TableKey,
  TableRow,
} from './types'
import { NEBEN_SPALTEN, PRODUKTION_SPALTEN, emptyInfo } from './types'
import { createChain as apiCreateChain, renameChain as apiRenameChain, deleteChain as apiDeleteChain } from './lib/api'

let counter = 0
function nextId(prefix = 'id'): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

/** Ketten-IDs müssen UUIDs sein (Spalte chains.id ist uuid in Supabase). */
function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
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

/** Höchste Position in der Schrittkette einer Abteilung (feste Schritte + Blöcke). */
function maxChainPosition(s: AppState, abteilungId: string): number {
  let max = 0
  for (const st of s.schritte) {
    if (st.abteilungId === abteilungId && !st.blockId && st.position > max) max = st.position
  }
  for (const b of s.bearbeitungsbloecke) {
    if (b.abteilungId === abteilungId && b.position > max) max = b.position
  }
  return max
}

/** Aktualisiert den Info-Bereich einer Abteilung. */
function patchInfo(
  s: AppState,
  abteilungId: string,
  fn: (info: InfoBereich) => InfoBereich,
): Partial<AppState> {
  return {
    abteilungen: s.abteilungen.map((a) =>
      a.id === abteilungId ? { ...a, info: fn(a.info ?? emptyInfo()) } : a,
    ),
  }
}

/** Aktualisiert die allgemeinen Produktinfos einer Kette. */
function patchChainInfo(
  s: AppState,
  chainId: string,
  fn: (info: InfoBereich) => InfoBereich,
): Partial<AppState> {
  return {
    chains: s.chains.map((c) => (c.id === chainId ? { ...c, info: fn(c.info ?? emptyInfo()) } : c)),
  }
}

/** Vertauscht die Position eines Kettenknotens (Schritt oder Block) mit dem Nachbarn. */
function swapChainNode(
  s: AppState,
  id: string,
  direction: 'up' | 'down',
): { schritte: Schritt[]; bearbeitungsbloecke: Bearbeitungsblock[] } {
  const step = s.schritte.find((x) => x.id === id)
  const block = s.bearbeitungsbloecke.find((x) => x.id === id)
  const abteilungId = step?.abteilungId ?? block?.abteilungId
  if (!abteilungId) return { schritte: s.schritte, bearbeitungsbloecke: s.bearbeitungsbloecke }

  const nodes: { id: string; position: number; isStep: boolean }[] = []
  for (const x of s.schritte) {
    if (x.abteilungId === abteilungId && !x.blockId) nodes.push({ id: x.id, position: x.position, isStep: true })
  }
  for (const b of s.bearbeitungsbloecke) {
    if (b.abteilungId === abteilungId) nodes.push({ id: b.id, position: b.position, isStep: false })
  }
  nodes.sort((a, b) => a.position - b.position)

  const idx = nodes.findIndex((n) => n.id === id)
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (idx < 0 || target < 0 || target >= nodes.length) {
    return { schritte: s.schritte, bearbeitungsbloecke: s.bearbeitungsbloecke }
  }
  const a = nodes[idx]
  const b = nodes[target]

  const schritte = s.schritte.map((x) => {
    if (a.isStep && x.id === a.id) return { ...x, position: b.position }
    if (b.isStep && x.id === b.id) return { ...x, position: a.position }
    return x
  })
  const bearbeitungsbloecke = s.bearbeitungsbloecke.map((x) => {
    if (!a.isStep && x.id === a.id) return { ...x, position: b.position }
    if (!b.isStep && x.id === b.id) return { ...x, position: a.position }
    return x
  })
  return { schritte, bearbeitungsbloecke }
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
  setAbteilungParent: (id: string, parentId: string | null) => void
  // Info je Abteilung (Feld-Definitionen + CAD-Modell)
  setAbteilungModel: (abteilungId: string, modelUrl: string | null, modelName: string | null) => void
  addInfoFeld: (abteilungId: string) => void
  renameInfoFeld: (abteilungId: string, feldId: string, name: string) => void
  changeInfoFeldType: (abteilungId: string, feldId: string, type: ColumnType) => void
  removeInfoFeld: (abteilungId: string, feldId: string) => void
  // Allgemeine Produktinfos je Kette
  addProduktFeld: (chainId: string) => void
  renameProduktFeld: (chainId: string, feldId: string, name: string) => void
  changeProduktFeldType: (chainId: string, feldId: string, type: ColumnType) => void
  removeProduktFeld: (chainId: string, feldId: string) => void

  // Variable Bearbeitungsblöcke
  addBearbeitungsblock: (abteilungId: string, name?: string) => void
  renameBearbeitungsblock: (id: string, name: string) => void
  removeBearbeitungsblock: (id: string) => void
  moveBearbeitungsblock: (id: string, direction: 'up' | 'down') => void

  // Schritte
  addSchritt: (abteilungId: string, blockId?: string | null, name?: string) => void
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
  setSchrittLoop: (schrittId: string, loopTargetId: string | null, loopCondition: string | null) => void
  setSchrittOptional: (schrittId: string, optional: boolean) => void
  setSchrittBlock: (schrittId: string, blockId: string | null) => void

  // Produktionstabellen (Maschinen)
  addProduktionstabelle: (schrittId: string, name?: string) => void
  renameProduktionstabelle: (id: string, name: string) => void
  setProduktionArbeitsplatz: (id: string, arbeitsplatz: string) => void
  removeProduktionstabelle: (id: string) => void
  addColumnProduktion: (tabelleId: string, name: string, type: ColumnType) => void
  renameColumnProduktion: (tabelleId: string, spalteId: string, name: string) => void
  changeColumnTypeProduktion: (tabelleId: string, spalteId: string, type: ColumnType) => void
  removeColumnProduktion: (tabelleId: string, spalteId: string) => void
  addRowProduktion: (tabelleId: string) => void
  addProdukt: (
    auftragsnummer: string,
    fn: string,
    datum: string,
    werte: {
      tabelleId: string
      spalten: Record<string, string>
      extraSpalten?: { id: string; name: string; type: ColumnType }[]
    }[],
  ) => void
  updateCellProduktion: (tabelleId: string, rowIndex: number, spalteId: string, value: string) => void
  removeRowProduktion: (tabelleId: string, rowIndex: number) => void
  setColumnKeyProduktion: (tabelleId: string, spalteId: string, keyType: KeyType | null) => void
  linkProduktionFK: (tabelleId: string, spalteId: string, refTableId: string, refColumnId: string) => void
  setKeyLabelProduktion: (tabelleId: string, spalteId: string, label: string) => void

  // Nebentabellen
  addNebentabelle: (abteilungId: string, name?: string) => void
  renameNebentabelle: (id: string, name: string) => void
  setNebenArbeitsplatz: (id: string, arbeitsplatz: string) => void
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
      bearbeitungsbloecke: demo.bearbeitungsbloecke,
      schritte: demo.schritte,
      produktionstabellen: demo.produktionstabellen,
      nebentabellen: demo.nebentabellen,

      // --- Ketten ---
      addChain: (name) =>
        set((s) => {
          const id = uuid()
          const chainName = name ?? `Kette ${s.chains.length + 1}`
          apiCreateChain(id, chainName, {
            abteilungen: [],
            bearbeitungsbloecke: [],
            schritte: [],
            produktionstabellen: [],
            nebentabellen: [],
          }).catch(() => {})
          return {
            chains: [...s.chains, { id, name: chainName }],
            activeChainId: id,
          }
        }),

      renameChain: (id, name) => {
        set((s) => ({ chains: s.chains.map((c) => (c.id === id ? { ...c, name } : c)) }))
        apiRenameChain(id, name).catch(() => {})
      },

      removeChain: (id) => {
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
        })
        apiDeleteChain(id).catch(() => {})
      },

      setActiveChain: (id) => set({ activeChainId: id }),

      // --- Abteilungen ---
      addAbteilung: (name) =>
        set((s) => ({
          abteilungen: [
            ...s.abteilungen,
            {
              id: nextId('a'),
              chainId: s.activeChainId,
              name: name ?? 'Neue Abteilung',
              parentId: null,
            },
          ],
        })),

  renameAbteilung: (id, name) =>
    set((s) => ({ abteilungen: s.abteilungen.map((a) => (a.id === id ? { ...a, name } : a)) })),

  setAbteilungParent: (id, parentId) =>
    set((s) => ({ abteilungen: s.abteilungen.map((a) => (a.id === id ? { ...a, parentId } : a)) })),

  // --- Info je Abteilung (Feld-Definitionen + CAD-Modell) ---
  setAbteilungModel: (abteilungId, modelUrl, modelName) =>
    set((s) => patchInfo(s, abteilungId, (info) => ({ ...info, modelUrl, modelName }))),

  addInfoFeld: (abteilungId) =>
    set((s) =>
      patchInfo(s, abteilungId, (info) => ({
        ...info,
        felder: [...info.felder, { id: nextId('f'), name: 'Neues Feld', type: 'text', value: '', fixed: false }],
      })),
    ),

  renameInfoFeld: (abteilungId, feldId, name) =>
    set((s) =>
      patchInfo(s, abteilungId, (info) => ({
        ...info,
        felder: info.felder.map((f) => (f.id === feldId ? { ...f, name } : f)),
      })),
    ),

  changeInfoFeldType: (abteilungId, feldId, type) =>
    set((s) =>
      patchInfo(s, abteilungId, (info) => ({
        ...info,
        felder: info.felder.map((f) => (f.id === feldId ? { ...f, type } : f)),
      })),
    ),

  removeInfoFeld: (abteilungId, feldId) =>
    set((s) =>
      patchInfo(s, abteilungId, (info) => ({
        ...info,
        felder: info.felder.filter((f) => f.id !== feldId),
      })),
    ),

  // --- Allgemeine Produktinfos je Kette (Produktinfo) ---
  addProduktFeld: (chainId) =>
    set((s) =>
      patchChainInfo(s, chainId, (info) => ({
        ...info,
        felder: [...info.felder, { id: nextId('f'), name: 'Neues Feld', type: 'text', value: '', fixed: false }],
      })),
    ),

  renameProduktFeld: (chainId, feldId, name) =>
    set((s) =>
      patchChainInfo(s, chainId, (info) => ({
        ...info,
        felder: info.felder.map((f) => (f.id === feldId ? { ...f, name } : f)),
      })),
    ),

  changeProduktFeldType: (chainId, feldId, type) =>
    set((s) =>
      patchChainInfo(s, chainId, (info) => ({
        ...info,
        felder: info.felder.map((f) => (f.id === feldId ? { ...f, type } : f)),
      })),
    ),

  removeProduktFeld: (chainId, feldId) =>
    set((s) =>
      patchChainInfo(s, chainId, (info) => ({
        ...info,
        felder: info.felder.filter((f) => f.id !== feldId),
      })),
    ),

  removeAbteilung: (id) =>
    set((s) => ({
      abteilungen: s.abteilungen.filter((a) => a.id !== id),
      bearbeitungsbloecke: s.bearbeitungsbloecke.filter((b) => b.abteilungId !== id),
      schritte: s.schritte.filter((st) => st.abteilungId !== id),
      nebentabellen: s.nebentabellen.filter((n) => n.abteilungId !== id),
      produktionstabellen: s.produktionstabellen.filter(
        (t) => !s.schritte.some((st) => st.abteilungId === id && st.id === t.schrittId),
      ),
    })),

  // --- Variable Bearbeitungsblöcke ---
  addBearbeitungsblock: (abteilungId, name) =>
    set((s) => ({
      bearbeitungsbloecke: [
        ...s.bearbeitungsbloecke,
        {
          id: nextId('b'),
          abteilungId,
          name: name ?? 'Variabler Block',
          position: maxChainPosition(s, abteilungId) + 1,
        },
      ],
    })),

  renameBearbeitungsblock: (id, name) =>
    set((s) => ({
      bearbeitungsbloecke: s.bearbeitungsbloecke.map((b) => (b.id === id ? { ...b, name } : b)),
    })),

  moveBearbeitungsblock: (id, direction) => set((s) => swapChainNode(s, id, direction)),

  removeBearbeitungsblock: (id) =>
    set((s) => {
      const block = s.bearbeitungsbloecke.find((b) => b.id === id)
      if (!block) return s
      let next = maxChainPosition(s, block.abteilungId)
      const schritte = s.schritte.map((st) => {
        if (st.blockId !== id) return st
        next += 1
        return { ...st, blockId: null, position: next }
      })
      return {
        bearbeitungsbloecke: s.bearbeitungsbloecke.filter((b) => b.id !== id),
        schritte,
      }
    }),

  // --- Schritte ---
  addSchritt: (abteilungId, blockId, name) =>
    set((s) => ({
      schritte: [
        ...s.schritte,
        {
          id: nextId('s'),
          abteilungId,
          blockId: blockId ?? null,
          name: name ?? `Schritt ${s.schritte.length + 1}`,
          position: blockId ? 0 : maxChainPosition(s, abteilungId) + 1,
          columns: [],
          keys: [],
          loopCondition: null,
          loopTargetId: null,
          optional: false,
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

  setSchrittLoop: (schrittId, loopTargetId, loopCondition) =>
    set((s) => ({
      schritte: s.schritte.map((st) =>
        st.id === schrittId ? { ...st, loopTargetId, loopCondition } : st,
      ),
    })),

  setSchrittOptional: (schrittId, optional) =>
    set((s) => ({
      schritte: s.schritte.map((st) => (st.id === schrittId ? { ...st, optional } : st)),
    })),

  setSchrittBlock: (schrittId, blockId) =>
    set((s) => {
      const st = s.schritte.find((x) => x.id === schrittId)
      if (!st) return s
      const position = blockId ? 0 : maxChainPosition(s, st.abteilungId) + 1
      return {
        schritte: s.schritte.map((x) =>
          x.id === schrittId ? { ...x, blockId, position } : x,
        ),
      }
    }),

  moveSchritt: (id, direction) => set((s) => swapChainNode(s, id, direction)),

  // --- Produktionstabellen ---
  addProduktionstabelle: (schrittId, name) =>
    set((s) => ({
      produktionstabellen: [
        ...s.produktionstabellen,
        {
          id: nextId('p'),
          schrittId,
          name: name ?? 'Neue Maschine',
          arbeitsplatz: '',
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

  setProduktionArbeitsplatz: (id, arbeitsplatz) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) => (t.id === id ? { ...t, arbeitsplatz } : t)),
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

  /** Fügt einen Fertigungsauftrag bei den gewählten Maschinen ein (mit den benutzten Werten). */
  addProdukt: (auftragsnummer, fn, datum, werte) =>
    set((s) => ({
      produktionstabellen: s.produktionstabellen.map((t) => {
        const eintrag = werte.find((w) => w.tabelleId === t.id)
        if (!eintrag) return t
        // Felder aus dem Schritt an der Maschine ergänzen (falls noch nicht vorhanden)
        const columns = [...t.columns]
        for (const extra of eintrag.extraSpalten ?? []) {
          if (columns.some((c) => c.id === extra.id)) continue
          if (columns.some((c) => c.name.trim().toLowerCase() === extra.name.trim().toLowerCase())) continue
          columns.push({ id: extra.id, name: extra.name, type: extra.type, fixed: false })
        }
        const zeile: TableRow = { ...emptyRow(columns), auftragsnummer, fn, datum }
        for (const c of columns) {
          if (c.id === 'auftragsnummer' || c.id === 'fn' || c.id === 'datum') continue
          zeile[c.id] = eintrag.spalten[c.id] ?? ''
        }
        return { ...t, columns, rows: [...t.rows, zeile] }
      }),
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
          arbeitsplatz: '',
          columns: cloneSpalten(NEBEN_SPALTEN),
          rows: [],
          keys: nebenKeys(),
        },
      ],
    })),

  renameNebentabelle: (id, name) =>
    set((s) => ({ nebentabellen: s.nebentabellen.map((t) => (t.id === id ? { ...t, name } : t)) })),

  setNebenArbeitsplatz: (id, arbeitsplatz) =>
    set((s) => ({ nebentabellen: s.nebentabellen.map((t) => (t.id === id ? { ...t, arbeitsplatz } : t)) })),

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
      nebentabellen: s.nebentabellen.map((t: Nebentabelle) => {
        if (t.id !== tabelleId) return t
        const keys = t.keys.filter((k: TableKey) => k.columnId !== spalteId)
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
      nebentabellen: s.nebentabellen.map((t: Nebentabelle) => {
        if (t.id !== tabelleId) return t
        const keys = t.keys.filter((k) => k.columnId !== spalteId)
        keys.push({ id: nextId('k'), columnId: spalteId, type: 'fk', refTableId, refColumnId })
        return { ...t, keys }
      }),
    })),

setKeyLabelNeben: (tabelleId, spalteId, label) =>
    set((s) => ({
      nebentabellen: s.nebentabellen.map((t: Nebentabelle) =>
        t.id === tabelleId
          ? { ...t, keys: t.keys.map((k: TableKey) => (k.columnId === spalteId ? { ...k, label } : k)) }
        : t,
      ),
    })),
  }),
    {
      name: 'digitale-produktakte',
      version: 11,
      migrate: (persisted, version) => {
        let p = persisted as Partial<AppState> & {
          abteilungen?: (Abteilung & { chainId?: string; parentId?: string | null; sequence?: 'fixed' | 'variable' })[]
          schritte?: (Schritt & { loopCondition?: string | null; loopTargetId?: string | null; optional?: boolean; blockId?: string | null })[]
        }
        if (version < 2) {
          p = {
            ...p,
            chains: p.chains && p.chains.length > 0 ? p.chains : [{ id: 'chain-test', name: 'Testkette' }],
            activeChainId: p.activeChainId || 'chain-test',
            abteilungen: (p.abteilungen ?? []).map((a) => ({ ...a, chainId: a.chainId ?? 'chain-test' })),
          } as typeof p
        }
        if (version < 3) {
          p = {
            ...p,
            schritte: (p.schritte ?? []).map((st) => ({
              ...st,
              loopCondition: st.loopCondition ?? null,
              loopTargetId: st.loopTargetId ?? null,
            })),
          } as typeof p
        }
        if (version < 4) {
          p = {
            ...p,
            abteilungen: (p.abteilungen ?? []).map((a) => ({
              ...a,
              parentId: a.parentId ?? null,
            })),
            schritte: (p.schritte ?? []).map((st) => ({
              ...st,
              optional: st.optional ?? false,
            })),
          } as typeof p
        }
        if (version < 5) {
          const cleaned = (p.abteilungen ?? []).map((a) => {
            const { sequence: _sequence, ...rest } = a as (Abteilung & { sequence?: string })
            return rest
          })
          p = {
            ...p,
            abteilungen: cleaned,
            bearbeitungsbloecke: p.bearbeitungsbloecke ?? [],
            schritte: (p.schritte ?? []).map((st) => ({
              ...st,
              blockId: st.blockId ?? null,
            })),
          } as typeof p
        }
        if (version < 6) {
          const blocks = (p.bearbeitungsbloecke ?? []).map((b, i) => ({
            ...b,
            position: (b as Bearbeitungsblock).position ?? i + 1,
          }))
          const steps = (p.schritte ?? []).map((st, i) => ({
            ...st,
            position: (st as Schritt).position ?? (st.blockId ? 0 : i + 1),
          }))
          p = {
            ...p,
            bearbeitungsbloecke: blocks,
            schritte: steps,
          } as typeof p
        }
        if (version < 7) {
          // Ketten-IDs auf UUIDs umstellen (Supabase-Spalte chains.id ist uuid)
          const renames = new Map<string, string>()
          const chains = (p.chains ?? []).map((c) => {
            if (isUuid(c.id)) return c
            const id = uuid()
            renames.set(c.id, id)
            return { ...c, id }
          })
          p = {
            ...p,
            chains,
            activeChainId: renames.get(p.activeChainId ?? '') ?? p.activeChainId,
            abteilungen: (p.abteilungen ?? []).map((a) => ({
              ...a,
              chainId: renames.get(a.chainId) ?? a.chainId,
            })),
          } as typeof p
        }
        if (version < 8) {
          p = {
            ...p,
            abteilungen: (p.abteilungen ?? []).map((a) => ({
              ...a,
              info: a.info ?? emptyInfo(),
            })),
          } as typeof p
        }
        if (version < 9) {
          // Mini-Tabellen entfernen; Felder bekommen "fixed"; Ketten bekommen allgemeine Produktinfos
          type AlteInfo = { modelUrl?: string | null; modelName?: string | null; felder?: InfoFeld[] }
          p = {
            ...p,
            abteilungen: (p.abteilungen ?? []).map((a) => {
              const info = (a.info ?? {}) as AlteInfo
              return {
                ...a,
                info: {
                  modelUrl: info.modelUrl ?? null,
                  modelName: info.modelName ?? null,
                  felder: (info.felder ?? []).map((f) => ({
                    ...f,
                    value: f.value ?? '',
                    fixed: f.fixed ?? false,
                  })),
                },
              }
            }),
            chains: (p.chains ?? []).map((c) => ({ ...c, info: c.info ?? emptyInfo() })),
          } as typeof p
        }
        if (version < 10) {
          // Jede Maschine bekommt eine feste Arbeitsplatz-Nummer
          p = {
            ...p,
            produktionstabellen: (p.produktionstabellen ?? []).map((t) => ({
              ...t,
              arbeitsplatz: t.arbeitsplatz ?? '',
            })),
          } as typeof p
        }
        if (version < 11) {
          // Jede Nebentabelle bekommt eine feste Arbeitsplatz-Nummer
          p = {
            ...p,
            nebentabellen: (p.nebentabellen ?? []).map((n) => ({
              ...n,
              arbeitsplatz: n.arbeitsplatz ?? '',
            })),
          } as typeof p
        }
        return p as AppState
      },
      partialize: (s) => ({
        chains: s.chains,
        activeChainId: s.activeChainId,
        abteilungen: s.abteilungen,
        bearbeitungsbloecke: s.bearbeitungsbloecke,
        schritte: s.schritte,
        produktionstabellen: s.produktionstabellen,
        nebentabellen: s.nebentabellen,
      }),
    },
  ),
)

// --- Demo-Daten (Wachs: Spritzen / Modellieren / Reinigen, je 4 Maschinen) ---

function seed(): AppState {
  const chainId = uuid()
  const chains: Chain[] = [{ id: chainId, name: 'Testkette' }]
  const activeChainId = chainId

  const abteilungen: Abteilung[] = [{ id: 'abt-wachs', chainId, name: 'Wachs', parentId: null }]

  const bearbeitungsbloecke: Bearbeitungsblock[] = []

  const schritte: Schritt[] = [
    { id: 's-spritzen', abteilungId: 'abt-wachs', blockId: null, name: '1. Spritzen', position: 1, columns: [], keys: [], loopCondition: null, loopTargetId: null, optional: false },
    { id: 's-modellieren', abteilungId: 'abt-wachs', blockId: null, name: '2. Modellieren', position: 2, columns: [], keys: [], loopCondition: null, loopTargetId: null, optional: false },
    { id: 's-reinigen', abteilungId: 'abt-wachs', blockId: null, name: '3. Reinigen', position: 3, columns: [], keys: [], loopCondition: null, loopTargetId: null, optional: false },
  ]

  const druckSpalte: TableColumn = { id: 'c-druck', name: 'Druck (bar)', type: 'number', fixed: false }

  const produktionstabellen: Produktionstabelle[] = []
  const schrittMachineNames: Record<string, string[]> = {
    's-spritzen': ['Wachsspritzmaschine 1', 'Wachsspritzmaschine 2', 'Wachsspritzmaschine 3', 'Wachsspritzmaschine 4'],
    's-modellieren': ['Modelliermaschine 1', 'Modelliermaschine 2', 'Modelliermaschine 3', 'Modelliermaschine 4'],
    's-reinigen': ['Reinigungsmaschine 1', 'Reinigungsmaschine 2', 'Reinigungsmaschine 3', 'Reinigungsmaschine 4'],
  }

  let arbeitsplatzNr = 100
  for (const s of schritte) {
    const names = schrittMachineNames[s.id]
    for (let i = 0; i < names.length; i++) {
      arbeitsplatzNr += 1
      produktionstabellen.push({
        id: `p-${s.id}-${i + 1}`,
        schrittId: s.id,
        name: names[i],
        arbeitsplatz: String(arbeitsplatzNr),
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
      arbeitsplatz: '201',
      columns: [...cloneSpalten(NEBEN_SPALTEN), { id: 'c-qual', name: 'Qualitätswert', type: 'number', fixed: false }],
      rows: [
        { datum: '2026-08-26', 'c-qual': '98' },
        { datum: '2026-08-27', 'c-qual': '87' },
      ],
      keys: [],
    },
  ]

  return { chains, activeChainId, abteilungen, bearbeitungsbloecke, schritte, produktionstabellen, nebentabellen }
}
