import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import type {
  ColumnType,
  Filter,
  KeyType,
  Produktionstabelle,
  TableColumn,
  TableKey,
  TabellenModus,
  TabellenRegister,
} from '../types'
import { COLUMN_TYPE_LABELS, SCHRITT_TABELLE_SPALTEN } from '../types'
import { useStore, arbeitsplatzFehlerText } from '../store'
import { istInSchleife } from '../utils/schleifen'
import {
  aggregateSchritt,
  formatPercent,
  isAggregateMode,
  isTraceMode,
  MASCHINEN_FARBEN,
} from '../utils/aggregate'
import { EditableName } from './EditableName'
import { InfoModal } from './InfoModal'
import { DurchlaufWahl } from './DurchlaufWahl'
import { einfuegenMaschine, einfuegenNebentabelle, kopiereAbteilung, kopiereMaschine, kopiereNebentabelle } from '../lib/tabellenKopie'
import { KeyBadge } from './KeyBadge'
import { keyTypeOf, nextKey } from '../utils/keys'
import { abteilungFarbe } from '../utils/colors'
import {
  getTabellenRegister,
  filterColumnsByRegister,
  countColumnsInRegister,
} from '../utils/register'

interface Props {
  filter: Filter
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function opacityForPercent(percent: number): number {
  if (percent <= 0) return 0.1
  return Math.max(0.1, percent / 100)
}

function orthogonalPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2
  return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`
}

/** Nächstgelegenes scrollbares Element (für Auto-Scroll beim Ziehen). */
function findeScroller(el: HTMLElement | null): HTMLElement | null {
  let cur = el?.parentElement ?? null
  while (cur) {
    const style = getComputedStyle(cur)
    if (
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      cur.scrollHeight > cur.clientHeight
    ) {
      return cur
    }
    cur = cur.parentElement
  }
  return (document.scrollingElement as HTMLElement | null) ?? null
}

function findColumnNode(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y)
  const node = el?.closest?.('[data-column-node]') as HTMLElement | null
  return node?.dataset.columnNode ?? null
}

function ColumnRow({
  nodeKey,
  registerRef,
  col,
  keyType,
  onRename,
  onChangeType,
  onRemove,
  onCycleKey,
  onStartDrag,
  compact,
  dark,
  registers,
  onMoveToRegister,
}: {
  nodeKey: string
  registerRef: (nodeKey: string) => (el: HTMLDivElement | null) => void
  col: TableColumn
  keyType: KeyType | null
  onRename: (name: string) => void
  onChangeType: (type: ColumnType) => void
  onRemove: () => void
  onCycleKey: () => void
  onStartDrag: (e: React.PointerEvent) => void
  compact?: boolean
  dark?: boolean
  registers?: TabellenRegister[]
  onMoveToRegister?: (targetRegisterId: string) => void
}) {
  return (
    <div
      ref={registerRef(nodeKey)}
      data-column-node={nodeKey}
      className={`flex items-center gap-1 border-t ${dark ? 'border-zinc-800' : 'border-slate-50'} ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}
    >
      {keyType === 'fk' && (
        <span
          onPointerDown={onStartDrag}
          className="h-3 w-3 shrink-0 cursor-grab rounded-full border-2 border-white bg-zollern-500 shadow hover:bg-zollern-600"
          title="Fremdschlüssel – ziehen, um Verbindung zu erstellen"
        />
      )}
      {col.fixed ? (
        <span className={`min-w-0 flex-1 font-medium ${dark ? 'text-zinc-200' : 'text-slate-700'} ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{col.name}</span>
      ) : (
        <EditableName
          value={col.name}
          onCommit={onRename}
          dark={dark}
          className={`min-w-0 flex-1 bg-transparent ${dark ? 'text-zinc-200' : 'text-slate-700'} outline-none ${compact ? 'text-[10px]' : 'text-[11px]'}`}
        />
      )}
      {/* Bei der Fertigungsauftrag-Nummer wird der Typ nicht angezeigt */}
      {col.id !== 'auftragsnummer' && (
        <select
          value={col.type}
          onChange={(e) => onChangeType(e.target.value as ColumnType)}
          className={`rounded border px-0.5 py-0 text-[9px] ${
            dark
              ? 'border-zinc-700 bg-zinc-900 text-zinc-300'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
          title="Spaltentyp"
        >
          {(Object.keys(COLUMN_TYPE_LABELS) as ColumnType[]).map((t) => (
            <option key={t} value={t}>
              {COLUMN_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      )}
      {registers && registers.length > 1 && !col.fixed && (
        <select
          value={col.registerId || 'allgemein'}
          onChange={(e) => onMoveToRegister?.(e.target.value)}
          className={`rounded border px-0.5 py-0 text-[9px] ${
            dark
              ? 'border-zinc-700 bg-zinc-900 text-zinc-300'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
          title="In Unterregister verschieben"
        >
          {registers.map((r) => (
            <option key={r.id} value={r.id}>
              📁 {r.name}
            </option>
          ))}
        </select>
      )}
      <KeyBadge type={keyType} onClick={onCycleKey} info={nodeKey} dark={dark} />
      {keyType === 'pk' && (
        <span
          onPointerDown={onStartDrag}
          className="h-3 w-3 shrink-0 cursor-grab rounded-full border-2 border-white bg-emerald-500 shadow hover:bg-emerald-600"
          title="Primärschlüssel – ziehen, um mit einem Fremdschlüssel zu verbinden"
        />
      )}
      {!col.fixed && (
        <button onClick={onRemove} className={dark ? 'text-zinc-500 hover:text-red-400' : 'text-slate-300 hover:text-red-500'} title="Spalte löschen">
          ✕
        </button>
      )}
    </div>
  )
}

interface EntityProps {
  title: string
  onRename: (name: string) => void
  onRemove: () => void
  percent?: number | null
  colorClass?: string
  children: React.ReactNode
  footer?: React.ReactNode
  compact?: boolean
  onAddColumn?: (name: string, type: ColumnType) => void
  /** 'extern' = Schritt wurde extern bearbeitet (lila Markierung) */
  rahmen?: 'normal' | 'extern'
  /** Betonte Darstellung (der Schritt ist leitend) */
  betont?: boolean
  /** Tabelle kopieren */
  onKopieren?: () => void
  /** Zusätzliches Element im Kopf (z. B. AP-Nummer) */
  kopfExtra?: React.ReactNode
  modus?: TabellenModus
  onModusChange?: (modus: TabellenModus) => void
  registers?: TabellenRegister[]
  activeRegisterId?: string | null
  columns?: TableColumn[]
  onSelectRegister?: (registerId: string | null) => void
  onAddRegister?: (name?: string) => void
  onRenameRegister?: (registerId: string, name: string) => void
  onRemoveRegister?: (registerId: string) => void
}

function EntityCard({
  title,
  onRename,
  onRemove,
  percent,
  colorClass,
  children,
  footer,
  compact,
  onAddColumn,
  rahmen = 'normal',
  betont = false,
  onKopieren,
  kopfExtra,
  modus = 'soll',
  onModusChange,
  registers,
  activeRegisterId,
  columns,
  onSelectRegister,
  onAddRegister,
  onRenameRegister,
  onRemoveRegister,
}: EntityProps) {
  const [addingCol, setAddingCol] = useState(false)
  const [colName, setColName] = useState('')
  const [colType, setColType] = useState<ColumnType>('text')
  const [editingRegId, setEditingRegId] = useState<string | null>(null)
  const [editingRegName, setEditingRegName] = useState('')

  const isCollapsed = activeRegisterId === null
  const currentActive = activeRegisterId ?? registers?.[0]?.id ?? 'allgemein'

  const submitColumn = () => {
    const trimmed = colName.trim()
    if (!trimmed) return
    onAddColumn?.(trimmed, colType)
    setColName('')
    setColType('text')
    setAddingCol(false)
  }
  const isIst = modus === 'ist'
  const rahmenKlasse = isIst ? 'border-zinc-800 bg-zinc-950 text-white shadow-sm ring-1 ring-zinc-800' :
    rahmen === 'extern'
      ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-300'
      : betont
        ? 'border-zollern-300 bg-white shadow-md'
        : 'border-slate-200 bg-white'
  const titelKlasse = isIst ? (compact ? 'text-[11px] font-semibold text-white' : 'text-xs font-semibold text-white') : betont
    ? 'text-sm font-bold text-zollern-800'
    : compact
      ? 'text-[11px] font-semibold text-slate-700'
      : 'text-xs font-semibold text-slate-700'
  return (
    <div className={`overflow-hidden rounded-lg border shadow-sm ${rahmenKlasse}`}>
      <div className={`flex items-center gap-1.5 border-b ${isIst ? 'border-zinc-800' : 'border-slate-100'} ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1.5'}`}>
        <span className={`shrink-0 rounded-full ${isIst ? 'bg-amber-400' : 'bg-zollern-500'} ${betont ? 'h-2.5 w-2.5' : 'h-2 w-2'}`} />
        <EditableName
          value={title}
          onCommit={onRename}
          dark={isIst}
          className={`min-w-0 flex-1 bg-transparent outline-none ${titelKlasse}`}
        />
        {kopfExtra}
        {typeof percent === 'number' && percent >= 0 && (
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isIst ? 'bg-zinc-800 text-zinc-300' : 'bg-zollern-50 text-zollern-700'}`}>
            {formatPercent(percent)}
          </span>
        )}
        {onKopieren && (
          <button
            onClick={onKopieren}
            className={`shrink-0 rounded px-1 text-xs ${isIst ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
            title="Tabelle kopieren (Spalten + Zeilen)"
          >
            ⧉
          </button>
        )}
        <button
          onClick={onRemove}
          className={`shrink-0 rounded px-1 text-xs ${isIst ? 'text-zinc-400 hover:bg-zinc-800 hover:text-red-400' : 'text-slate-400 hover:bg-red-50 hover:text-red-600'}`}
          title="Löschen"
        >
          ✕
        </button>
      </div>
      {typeof percent === 'number' && percent >= 0 && (
        <div className={`h-0.5 w-full ${isIst ? 'bg-zinc-800' : 'bg-slate-100'}`}>
          <div className={`h-full ${colorClass ?? 'bg-zollern-500'}`} style={{ width: `${percent}%` }} />
        </div>
      )}
      {registers && registers.length > 0 && (
        <div
          className={`flex flex-wrap items-center justify-between gap-1 border-b px-2 py-1 text-[10px] select-none ${
            isIst
              ? 'border-zinc-800 bg-zinc-900/80 text-zinc-300'
              : 'border-slate-100 bg-slate-50/80 text-slate-600'
          }`}
        >
          <div className="flex flex-wrap items-center gap-1 min-w-0">
            {registers.map((reg) => {
              const isActive = !isCollapsed && currentActive === reg.id
              const count = columns ? countColumnsInRegister(columns, reg.id) : undefined

              return (
                <div
                  key={reg.id}
                  className={`group flex items-center gap-0.5 rounded px-1.5 py-0.5 transition-all ${
                    isActive
                      ? isIst
                        ? 'bg-zinc-800 text-white font-semibold ring-1 ring-zinc-700'
                        : 'bg-white text-slate-900 font-semibold shadow-xs ring-1 ring-slate-200'
                      : isIst
                        ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                        : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800'
                  }`}
                >
                  {editingRegId === reg.id ? (
                    <input
                      value={editingRegName}
                      onChange={(e) => setEditingRegName(e.target.value)}
                      onBlur={() => {
                        if (editingRegName.trim()) {
                          onRenameRegister?.(reg.id, editingRegName.trim())
                        }
                        setEditingRegId(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editingRegName.trim()) {
                            onRenameRegister?.(reg.id, editingRegName.trim())
                          }
                          setEditingRegId(null)
                        }
                        if (e.key === 'Escape') setEditingRegId(null)
                      }}
                      autoFocus
                      className={`w-16 rounded border px-1 py-0 text-[10px] outline-none ${
                        isIst ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-slate-300 bg-white text-slate-800'
                      }`}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectRegister?.(isActive ? null : reg.id)}
                      className="flex items-center gap-1 cursor-pointer"
                      title={isActive ? 'Klicken zum Einklappen' : 'Reiter öffnen'}
                    >
                      <span className="truncate max-w-[80px]">{reg.name}</span>
                      {typeof count === 'number' && (
                        <span
                          className={`text-[8px] px-1 rounded-full font-medium ${
                            isActive
                              ? isIst
                                ? 'bg-zinc-700 text-zinc-200'
                                : 'bg-slate-100 text-slate-600'
                              : isIst
                                ? 'bg-zinc-800 text-zinc-500'
                                : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  )}

                  {editingRegId !== reg.id && onRenameRegister && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingRegId(reg.id)
                        setEditingRegName(reg.name)
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-zollern-500 p-0.5 text-[8px]"
                      title="Reiter umbenennen"
                    >
                      ✎
                    </button>
                  )}

                  {registers.length > 1 && editingRegId !== reg.id && onRemoveRegister && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (
                          window.confirm(
                            `Reiter "${reg.name}" löschen? Enthaltene Spalten werden in den Standard-Reiter verschoben.`
                          )
                        ) {
                          onRemoveRegister(reg.id)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5 text-[8px]"
                      title="Reiter löschen (Spalten bleiben erhalten)"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}

            {onAddRegister && (
              <button
                type="button"
                onClick={() => {
                  const name = window.prompt('Name des neuen Reiters:')
                  if (name && name.trim()) {
                    onAddRegister(name.trim())
                  }
                }}
                className={`rounded px-1 py-0.5 text-[9px] font-semibold transition-colors ${
                  isIst
                    ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    : 'text-slate-400 hover:bg-slate-200/60 hover:text-slate-700'
                }`}
                title="Neuen Reiter anlegen"
              >
                +
              </button>
            )}
          </div>

          {onSelectRegister && (
            <button
              type="button"
              onClick={() => onSelectRegister(isCollapsed ? registers[0]?.id ?? 'allgemein' : null)}
              className={`text-[9px] hover:underline shrink-0 ${
                isIst ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-700'
              }`}
              title={isCollapsed ? 'Reiter ausklappen' : 'Reiter einklappen'}
            >
              {isCollapsed ? '▸ Ausklappen' : '▾ Einklappen'}
            </button>
          )}
        </div>
      )}
      <div>{children}</div>
      {onAddColumn && (
        <div className={`border-t ${isIst ? 'border-zinc-800' : 'border-slate-100'}`}>
          {addingCol ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                className={`min-w-0 flex-1 rounded border px-1.5 py-0.5 text-[10px] ${isIst ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500' : 'border-slate-200 bg-white text-slate-800'}`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitColumn()
                  if (e.key === 'Escape') setAddingCol(false)
                }}
              />
              <select
                value={colType}
                onChange={(e) => setColType(e.target.value as ColumnType)}
                className={`rounded border px-0.5 py-0.5 text-[10px] ${isIst ? 'border-zinc-700 bg-zinc-900 text-zinc-200' : 'border-slate-200 bg-white text-slate-700'}`}
              >
                <option value="text">Text</option>
                <option value="number">Zahl</option>
                <option value="date">Datum</option>
              </select>
              <button onClick={submitColumn} className="rounded bg-zollern-700 px-1.5 py-0.5 text-[10px] text-white hover:bg-zollern-800">
                ✓
              </button>
              <button onClick={() => setAddingCol(false)} className={`rounded px-1 ${isIst ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-400 hover:text-slate-600'}`}>
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              className={`w-full px-2 py-1 text-left text-[10px] font-medium ${isIst ? 'text-zinc-300 hover:bg-zinc-900' : 'text-zollern-700 hover:bg-zollern-50'}`}
            >
              + Feld
            </button>
          )}
        </div>
      )}
      {footer}
      {onModusChange && (
        <div className={`flex justify-end border-t px-2 py-1 ${isIst ? 'border-zinc-800' : 'border-slate-100'}`}>
          <div className={`inline-flex items-center rounded p-0.5 text-[9px] font-medium ${
            isIst ? 'bg-zinc-900 border border-zinc-700/80' : 'bg-slate-100 border border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => onModusChange('soll')}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                !isIst
                  ? 'bg-white text-slate-800 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Soll-Tabelle (Vorgabe/Planung)"
            >
              Soll
            </button>
            <button
              type="button"
              onClick={() => onModusChange('ist')}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                isIst
                  ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Ist-Tabelle (Erfassung/Rückmeldung - Dunkelmodus)"
            >
              Ist
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


const LANE_STEP = 14

export interface RenderedConnection {
  id: string
  sourceKey: string
  targetKey: string
  from: Rect
  to: Rect
  ltr: boolean
  rtl: boolean
  sameCol: boolean
  x1: number
  y1: number
  x2: number
  y2: number
  xLane: number
  path: string
  handleX: number
  handleY: number
  label: string
  kardinalitaet: 'n:1' | '1:n' | '1:1' | 'n:m' | string
  keyKind: 'm' | 'n' | 's'
  keyTableId: string
  keyColumnId: string
  offset: number
  color: string
}

interface RawLineDef {
  sourceKey: string
  targetKey: string
  label: string
  n1: boolean
  kardinalitaet: 'n:1' | '1:n' | '1:1' | 'n:m' | string
  keyKind: 'm' | 'n' | 's'
  keyTableId: string
  keyColumnId: string
  offset: number
}

interface LaneRoutingResult {
  connections: RenderedConnection[]
  junctionDots: { x: number; y: number }[]
}

/**
 * Feste Spuren-Routing (Lane Routing):
 * Weist vertikalen Liniensegmenten kollisionsfreie Spuren (X-Koordinaten) zu.
 * Parallele Überlappungen werden verhindert; 90°-Rechtwinkligkeit bleibt gewahrt.
 * Linien zum selben Ziel münden gemeinsam in den Ziel-Sockel.
 */
function computeLaneRouting(
  lines: RawLineDef[],
  boxes: Record<string, Rect>,
): LaneRoutingResult {
  const validLines = lines
    .map((ln) => {
      const from = boxes[ln.sourceKey]
      const to = boxes[ln.targetKey]
      if (!from || !to) return null
      const ltr = from.x + from.w <= to.x + 20
      const rtl = from.x >= to.x + to.w - 20
      const sameCol = !ltr && !rtl
      const x1 = ltr ? from.x + from.w : from.x
      const y1 = from.y + from.h / 2
      const x2 = ltr ? to.x : (rtl ? to.x + to.w : to.x)
      const y2 = to.y + to.h / 2
      const minY = Math.min(y1, y2)
      const maxY = Math.max(y1, y2)
      return {
        ...ln,
        id: `${ln.sourceKey}->${ln.targetKey}`,
        from,
        to,
        ltr,
        rtl,
        sameCol,
        x1,
        y1,
        x2,
        y2,
        minY,
        maxY,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  // In Korridore nach Ausrichtung gruppieren
  const corridorGroups = new Map<string, typeof validLines>()
  for (const ln of validLines) {
    const key = ln.ltr
      ? `ltr_${Math.round(ln.to.x / 100) * 100}`
      : ln.rtl
        ? `rtl_${Math.round((ln.to.x + ln.to.w) / 100) * 100}`
        : `same_${Math.round(Math.min(ln.from.x, ln.to.x) / 100) * 100}`
    const list = corridorGroups.get(key) || []
    list.push(ln)
    corridorGroups.set(key, list)
  }

  const connections: RenderedConnection[] = []
  const junctionDots: { x: number; y: number }[] = []

  // Lane Allocation je Korridor (Intervall-Färbung zur Vermeidung von Überlappungen)
  for (const [, list] of corridorGroups.entries()) {
    list.sort((a, b) => a.minY - b.minY || a.maxY - b.maxY)
    const laneIntervals: { minY: number; maxY: number }[][] = []

    for (const item of list) {
      let laneIndex = 0
      while (true) {
        const intervals = laneIntervals[laneIndex] || []
        const hasOverlap = intervals.some(
          (iv) => Math.max(item.minY, iv.minY) <= Math.min(item.maxY, iv.maxY) + 6,
        )
        if (!hasOverlap) {
          if (!laneIntervals[laneIndex]) laneIntervals[laneIndex] = []
          laneIntervals[laneIndex].push({ minY: item.minY, maxY: item.maxY })
          break
        }
        laneIndex++
      }

      // X-Position der Lane berechnen
      let xLane: number
      if (item.ltr) {
        const base = item.to.x - 18
        xLane = base - laneIndex * LANE_STEP + item.offset
      } else if (item.rtl) {
        const base = item.to.x + item.to.w + 18
        xLane = base + laneIndex * LANE_STEP + item.offset
      } else {
        const base = Math.min(item.from.x, item.to.x) - 18
        xLane = base - laneIndex * LANE_STEP + item.offset
      }

      const path = `M ${item.x1} ${item.y1} H ${xLane} V ${item.y2} H ${item.x2}`
      const handleX = xLane
      const handleY = (item.y1 + item.y2) / 2

      // Farbe nach Tabelle: Nebentabelle (Unterstützung) = Teal, Maschine = Slate, Schritt = Violett
      const color =
        item.keyKind === 'n'
          ? '#0d9488'
          : item.keyKind === 's'
            ? '#7c3aed'
            : '#64748b'

      connections.push({
        id: item.id,
        sourceKey: item.sourceKey,
        targetKey: item.targetKey,
        from: item.from,
        to: item.to,
        ltr: item.ltr,
        rtl: item.rtl,
        sameCol: item.sameCol,
        x1: item.x1,
        y1: item.y1,
        x2: item.x2,
        y2: item.y2,
        xLane,
        path,
        handleX,
        handleY,
        label: item.label,
        kardinalitaet: item.kardinalitaet || 'n:1',
        keyKind: item.keyKind,
        keyTableId: item.keyTableId,
        keyColumnId: item.keyColumnId,
        offset: item.offset,
        color,
      })
    }
  }

  // Abzweig-Punkte (Junctions) markieren bei Mehrfach-Verbindungen auf denselben Schlüssel
  const targetMap = new Map<string, RenderedConnection[]>()
  for (const c of connections) {
    const list = targetMap.get(c.targetKey) || []
    list.push(c)
    targetMap.set(c.targetKey, list)
  }
  for (const [, conns] of targetMap.entries()) {
    if (conns.length > 1) {
      const toY = conns[0].y2
      for (const c of conns) {
        junctionDots.push({ x: c.xLane, y: toY })
      }
    }
  }

  return { connections, junctionDots }
}

/** Kürzeste rechtwinklige Prozessverbindung: normal unten → oben, sonst Seite → Seite. */
function prozessPfad(from: Rect, to: Rect): string {
  const cx1 = from.x + from.w / 2
  const cx2 = to.x + to.w / 2
  const unten = to.y >= from.y + from.h - 2
  const oben = to.y + to.h <= from.y + 2
  if (unten || oben) {
    const yStart = unten ? from.y + from.h : from.y
    const yEnd = unten ? to.y : to.y + to.h
    return `M ${cx1} ${yStart} V ${(yStart + yEnd) / 2} H ${cx2} V ${yEnd}`
  }
  const ltr = from.x <= to.x
  const xStart = ltr ? from.x + from.w : from.x
  const xEnd = ltr ? to.x : to.x + to.w
  const cy1 = from.y + from.h / 2
  const cy2 = to.y + to.h / 2
  return `M ${xStart} ${cy1} H ${(xStart + xEnd) / 2} V ${cy2} H ${xEnd}`
}

function LoopLine({ from, to, label }: { from: Rect; to: Rect; label: string }) {
  const x1 = from.x
  const y1 = from.y + from.h / 2
  const x2 = to.x
  const y2 = to.y + to.h / 2
  const curve = 54
  const path = `M ${x1} ${y1} C ${x1 - curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`
  const labelX = Math.min(x1, x2) - curve - 4
  const labelY = (y1 + y2) / 2
  const halo = { paintOrder: 'stroke' as const, stroke: '#ffffff', strokeWidth: 3 }
  return (
    <g>
      <path d={path} stroke="#c45004" strokeWidth={1.5} fill="none" strokeDasharray="5 4" markerEnd="url(#er-loop-arrow)" />
      {label && (
        <text x={labelX} y={labelY} textAnchor="end" fontSize={9} fill="#c45004" style={halo}>
          {label}
        </text>
      )}
    </g>
  )
}

/** Zeigt neben der Maschine, wie oft sie für den Auftrag verwendet wurde (Schleifen). */
function VerwendetHinweis({
  tabelle,
  auftrag,
  inSchleife,
}: {
  tabelle: Produktionstabelle
  auftrag: string
  inSchleife: boolean
}) {
  const anzahl = tabelle.rows.filter((r) => r.auftragsnummer === auftrag).length
  if (!inSchleife || anzahl === 0) return null
  return (
    <div
      className={`border-t px-2 py-0.5 text-[10px] font-semibold ${
        tabelle.modus === 'ist'
          ? 'border-orange-950 bg-orange-950/40 text-orange-400'
          : 'border-orange-100 bg-orange-50 text-orange-700'
      }`}
      title="So oft wurde die Maschine für diesen Fertigungsauftrag verwendet"
    >
      {anzahl}× verwendet
    </div>
  )
}

/** Arbeitsplatz-Nummer einer Maschine – klein im Kopf („AP“), gilt für alle Einträge. */
function ArbeitsplatzZeile({
  tabelleId,
  wert,
  onChange,
  dark,
}: {
  tabelleId: string
  wert?: string
  onChange: (id: string, wert: string) => void
  dark?: boolean
}) {
  const [draft, setDraft] = useState(wert ?? '')
  const [fehler, setFehler] = useState<string | null>(null)
  const [letzterWert, setLetzterWert] = useState(wert)

  // Prop-Änderung von außen übernehmen (ohne Effekt)
  if (wert !== letzterWert) {
    setLetzterWert(wert)
    setDraft(wert ?? '')
  }

  const aendern = (v: string) => {
    setDraft(v)
    const f = arbeitsplatzFehlerText(tabelleId, v)
    setFehler(f)
    if (!f) onChange(tabelleId, v)
  }

  const inputKlasse = dark
    ? fehler
      ? 'border-red-500 bg-zinc-900 text-red-300 focus:border-red-400'
      : draft
        ? 'border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-zinc-500'
        : 'border-amber-600/60 bg-zinc-900 text-zinc-400 focus:border-amber-500'
    : fehler
      ? 'border-red-400 text-red-600 focus:border-zollern-400'
      : draft
        ? 'border-slate-200 text-slate-700 focus:border-zollern-400'
        : 'border-red-300 text-slate-500 focus:border-zollern-400'

  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <span className={`text-[9px] font-bold uppercase tracking-wide ${dark ? 'text-zinc-400' : 'text-slate-400'}`}>AP</span>
      <input
        value={draft}
        onChange={(e) => aendern(e.target.value)}
        placeholder="Nr."
        className={`w-14 rounded border px-1 py-0.5 text-[10px] outline-none ${inputKlasse}`}
        title={
          fehler ?? (draft ? 'Arbeitsplatz-Nummer (gilt für alle Einträge)' : 'Arbeitsplatz-Nummer fehlt')
        }
      />
    </span>
  )
}

export function TabellenbezogenView({ filter }: Props) {
  const alleAbteilungen = useStore((s) => s.abteilungen)
  const activeChainId = useStore((s) => s.activeChainId)
  const alleSchritte = useStore((s) => s.schritte)
  const alleBloecke = useStore((s) => s.bearbeitungsbloecke)
  const alleMaschinen = useStore((s) => s.produktionstabellen)
  const alleNeben = useStore((s) => s.nebentabellen)

  const abteilungen = alleAbteilungen.filter((a) => a.chainId === activeChainId)

  const {
    addSchritt,
    renameSchritt,
    removeSchritt,
    moveSchritt,
    moveBlockSchritt,
    addColumnSchritt,
    renameColumnSchritt,
    changeColumnTypeSchritt,
    removeColumnSchritt,
    setColumnKeySchritt,
    linkSchrittFK,
    setSchrittLoop,
    setSchrittOptional,
    setSchrittBlock,
    renameAbteilung,
    removeAbteilung,
    setAbteilungParent,
    addBearbeitungsblock,
    renameBearbeitungsblock,
    removeBearbeitungsblock,
    moveBearbeitungsblock,
    addProduktionstabelle,
    renameProduktionstabelle,
    removeProduktionstabelle,
    setProduktionArbeitsplatz,
    setProduktionModus,
    addColumnProduktion,
    renameColumnProduktion,
    changeColumnTypeProduktion,
    removeColumnProduktion,
    setColumnKeyProduktion,
    linkProduktionFK,
    addNebentabelle,
    renameNebentabelle,
    removeNebentabelle,
    setNebenArbeitsplatz,
    setNebenModus,
    setNebenSchritt,
    loescheBeziehung,
    setBeziehungOffset,
    addColumnNeben,
    renameColumnNeben,
    changeColumnTypeNeben,
    removeColumnNeben,
    setColumnKeyNeben,
    linkNebenFK,
    addRegister,
    renameRegister,
    removeRegister,
    setActiveRegister,
    moveColumnToRegister,
    setBeziehungKardinalitaet,
  } = useStore()

  const trace = isTraceMode(filter)
  const aggregate = isAggregateMode(filter)
  const auftrag = filter.auftragsnummer.trim()

  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef(new Map<string, HTMLElement>())
  const [boxes, setBoxes] = useState<Record<string, Rect>>({})
  const [origin, setOrigin] = useState({ left: 0, top: 0 })
  const [dragPos, setDragPos] = useState<{ x: number; y: number; sourceKey: string } | null>(null)
  const [infoAbt, setInfoAbt] = useState<string | null>(null)
  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null)
  const [kardinalitaetMenue, setKardinalitaetMenue] = useState<{
    x: number
    y: number
    conn: RenderedConnection
  } | null>(null)
  const [menue, setMenue] = useState<{
    x: number
    y: number
    eintraege: { text: string; kind: 'm' | 'n' | 's'; tableId: string; columnId: string }[]
  } | null>(null)

  /** Rechtsklick auf ein PK/FK-Badge: Beziehungen dieser Spalte anzeigen/entfernen. */
  const onKontextMenue = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest('[data-key-node]') as HTMLElement | null
    const knoten = el?.getAttribute('data-key-node')
    if (!knoten) return
    const [kind, tableId, columnId] = knoten.split(':') as ['m' | 'n' | 's', string, string]
    const s = useStore.getState()
    const tabelle =
      kind === 'm'
        ? s.produktionstabellen.find((t) => t.id === tableId)
        : kind === 'n'
          ? s.nebentabellen.find((t) => t.id === tableId)
          : s.schritte.find((t) => t.id === tableId)
    if (!tabelle) return
    e.preventDefault()
    e.stopPropagation()
    const eintraege: { text: string; kind: 'm' | 'n' | 's'; tableId: string; columnId: string }[] = []
    const spaltenName = tabelle.columns.find((c) => c.id === columnId)?.name ?? columnId
    // eigene FK-Beziehung dieser Spalte
    if (tabelle.keys.some((k) => k.columnId === columnId && k.type === 'fk')) {
      eintraege.push({
        text: `Diese Beziehung entfernen (${spaltenName})`,
        kind,
        tableId,
        columnId,
      })
    }
    // Fremdschlüssel, die auf diese PK-Spalte zeigen
    if (tabelle.keys.some((k) => k.columnId === columnId && k.type === 'pk')) {
      const sammle = (
        k2: 'm' | 'n' | 's',
        liste: { id: string; name: string; keys: TableKey[]; columns: TableColumn[] }[],
      ) => {
        for (const t of liste) {
          for (const k of t.keys) {
            if (k.type === 'fk' && k.refTableId === tableId && k.refColumnId === columnId) {
              const sp = t.columns.find((c) => c.id === k.columnId)?.name ?? k.columnId
              eintraege.push({
                text: `Beziehung von ${t.name}.${sp} lösen`,
                kind: k2,
                tableId: t.id,
                columnId: k.columnId,
              })
            }
          }
        }
      }
      sammle('m', s.produktionstabellen)
      sammle('n', s.nebentabellen)
      sammle('s', s.schritte)
    }
    if (eintraege.length === 0) return
    // Menü innerhalb des sichtbaren Bereichs halten
    const breite = 280
    const hoehe = eintraege.length * 30 + 46
    const x = Math.max(8, Math.min(e.clientX, window.innerWidth - breite - 8))
    const y = Math.max(8, Math.min(e.clientY, window.innerHeight - hoehe - 8))
    setMenue({ x, y, eintraege })
  }

  const registerRef = (nodeKey: string) => (el: HTMLElement | null) => {
    if (el) nodeRefs.current.set(nodeKey, el)
    else nodeRefs.current.delete(nodeKey)
  }

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current
      if (!container) return
      const cr = container.getBoundingClientRect()
      setOrigin({ left: cr.left, top: cr.top })
      const next: Record<string, Rect> = {}
      for (const [id, el] of nodeRefs.current.entries()) {
        const r = el.getBoundingClientRect()
        next[id] = { x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height }
      }
      setBoxes(next)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [alleAbteilungen, alleBloecke, alleSchritte, alleMaschinen, alleNeben])

  const resolveKeyType = (kind: string, tableId: string, columnId: string): KeyType | null => {
    if (kind === 'm') {
      const t = alleMaschinen.find((x) => x.id === tableId)
      return t ? keyTypeOf(t.keys, columnId) : null
    }
    if (kind === 'n') {
      const t = alleNeben.find((x) => x.id === tableId)
      return t ? keyTypeOf(t.keys, columnId) : null
    }
    if (kind === 's') {
      const t = alleSchritte.find((x) => x.id === tableId)
      if (columnId === 'auftragsnummer') return 'pk'
      return t ? keyTypeOf(t.keys, columnId) : null
    }
    return null
  }

  const moveNebenToStep = (nebenId: string, dir: 'up' | 'down') => {
    const t = alleNeben.find((x) => x.id === nebenId)
    if (!t) return
    const deptSteps = alleSchritte
      .filter((s) => s.abteilungId === t.abteilungId)
      .sort((x, y) => x.position - y.position)
    if (deptSteps.length === 0) return
    const currentStepId = t.schrittId ?? deptSteps[0]?.id
    const idx = deptSteps.findIndex((s) => s.id === currentStepId)
    if (idx < 0) {
      setNebenSchritt(nebenId, deptSteps[0].id)
      return
    }
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1
    if (targetIdx >= 0 && targetIdx < deptSteps.length) {
      setNebenSchritt(nebenId, deptSteps[targetIdx].id)
    }
  }

  const startDrag =
    (kind: 'm' | 'n' | 's', tableId: string, columnId: string, keyType: KeyType | null) =>
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      const sourceKey = `${kind}:${tableId}:${columnId}`

      // Ursprung aktualisieren (falls vorher gescrollt wurde)
      const c0 = containerRef.current
      if (c0) {
        const cr0 = c0.getBoundingClientRect()
        setOrigin({ left: cr0.left, top: cr0.top })
      }
      setDragPos({ x: e.clientX, y: e.clientY, sourceKey })

      // Auto-Scroll beim Ziehen an den oberen/unteren Rand
      const scroller = findeScroller(e.currentTarget as HTMLElement)
      let letzteY = e.clientY
      let raf = 0
      const rand = 80
      const tick = () => {
        raf = requestAnimationFrame(tick)
        if (!scroller) return
        const r = scroller.getBoundingClientRect()
        let delta = 0
        if (letzteY < r.top + rand) delta = -Math.ceil((r.top + rand - letzteY) / 4)
        else if (letzteY > r.bottom - rand) delta = Math.ceil((letzteY - (r.bottom - rand)) / 4)
        if (delta !== 0) {
          const vorher = scroller.scrollTop
          scroller.scrollTop = vorher + delta
          if (scroller.scrollTop !== vorher) {
            const c = containerRef.current
            if (c) {
              const cr = c.getBoundingClientRect()
              setOrigin({ left: cr.left, top: cr.top })
            }
          }
        }
      }
      raf = requestAnimationFrame(tick)

      const move = (ev: PointerEvent) => {
        letzteY = ev.clientY
        setDragPos({ x: ev.clientX, y: ev.clientY, sourceKey })
      }
      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        cancelAnimationFrame(raf)
        setDragPos(null)
        const target = findColumnNode(ev.clientX, ev.clientY)
        if (!target) return
        const [tKind, tTableId, tColId] = target.split(':')
        const tKeyType = resolveKeyType(tKind, tTableId, tColId)

        let fkSide: { kind: 'm' | 'n' | 's'; tableId: string; columnId: string } | null = null
        let pkSide: { tableId: string; columnId: string } | null = null

        if (keyType === 'fk' && tKeyType !== 'fk') {
          // FK -> Ziel (PK oder Feld): FK referenziert das Ziel
          fkSide = { kind, tableId, columnId }
          pkSide = { tableId: tTableId, columnId: tColId }
        } else if (keyType === 'pk' && tKeyType !== 'pk') {
          // PK -> Ziel: Ziel wird FK und referenziert diese PK
          const isCustomStep =
            tKind === 's' &&
            !!alleSchritte.find((x) => x.id === tTableId)?.columns.some((c) => c.id === tColId)
          if (tKind === 'm' || tKind === 'n' || isCustomStep) {
            fkSide = { kind: tKind as 'm' | 'n' | 's', tableId: tTableId, columnId: tColId }
            pkSide = { tableId, columnId }
          }
        }

        if (fkSide && pkSide) {
          if (fkSide.kind === 'm') {
            linkProduktionFK(fkSide.tableId, fkSide.columnId, pkSide.tableId, pkSide.columnId)
          } else if (fkSide.kind === 'n') {
            linkNebenFK(fkSide.tableId, fkSide.columnId, pkSide.tableId, pkSide.columnId)
          } else {
            linkSchrittFK(fkSide.tableId, fkSide.columnId, pkSide.tableId, pkSide.columnId)
          }
        }
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    }

  /** Beziehungslinie ziehen: verschiebt die Lane (Versatz wird gespeichert). */
  const startLinienDrag =
    (conn: RenderedConnection) => (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      const kind = conn.keyKind
      const tableId = conn.keyTableId
      const columnId = conn.keyColumnId
      const startX = e.clientX
      const startOffset = conn.offset
      const move = (ev: PointerEvent) => {
        const neu = Math.max(-320, Math.min(320, Math.round(startOffset + (ev.clientX - startX))))
        setBeziehungOffset(kind, tableId, columnId, neu)
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    }

  const kindByTableId = new Map<string, string>()
  for (const m of alleMaschinen) kindByTableId.set(m.id, 'm')
  for (const st of alleSchritte) kindByTableId.set(st.id, 's')
  for (const n of alleNeben) kindByTableId.set(n.id, 'n')

  const lines: RawLineDef[] = []
  for (const m of alleMaschinen) {
    for (const k of m.keys) {
      if (k.type !== 'fk' || !k.refTableId || !k.refColumnId) continue
      const targetKind = kindByTableId.get(k.refTableId)
      if (!targetKind) continue
      const colName = m.columns.find((c) => c.id === k.columnId)?.name ?? k.columnId
      lines.push({
        sourceKey: `m:${m.id}:${k.columnId}`,
        targetKey: `${targetKind}:${k.refTableId}:${k.refColumnId}`,
        label: k.label ?? colName,
        n1: true,
        kardinalitaet: (k.kardinalitaet as any) || (k.columnId === 'datum' ? '1:1' : 'n:1'),
        keyKind: 'm',
        keyTableId: m.id,
        keyColumnId: k.columnId,
        offset: k.offset ?? 0,
      })
    }
  }
  for (const n of alleNeben) {
    for (const k of n.keys) {
      if (k.type !== 'fk' || !k.refTableId || !k.refColumnId) continue
      const targetKind = kindByTableId.get(k.refTableId)
      if (!targetKind) continue
      const colName = n.columns.find((c) => c.id === k.columnId)?.name ?? k.columnId
      lines.push({
        sourceKey: `n:${n.id}:${k.columnId}`,
        targetKey: `${targetKind}:${k.refTableId}:${k.refColumnId}`,
        label: k.label ?? colName,
        n1: true,
        kardinalitaet: (k.kardinalitaet as any) || 'n:1',
        keyKind: 'n',
        keyTableId: n.id,
        keyColumnId: k.columnId,
        offset: k.offset ?? 0,
      })
    }
  }
  // Prozesskette Schritt → Schritt: wird separat als Linie "mittig unten → mittig oben" gezeichnet.
  // Die Reihenfolge wird beim Zeichnen nach der tatsächlichen Höhe bestimmt (nie nach oben).
  const kettenKnoten: string[][] = []
  for (const a of abteilungen) {
    const knoten: { pos: number; key: string }[] = []
    for (const st of alleSchritte.filter((st) => st.abteilungId === a.id && !st.blockId)) {
      knoten.push({ pos: st.position, key: `sc:${st.id}` })
    }
    for (const b of alleBloecke.filter((b) => b.abteilungId === a.id)) {
      knoten.push({ pos: b.position, key: `bc:${b.id}` })
    }
    knoten.sort((x, y) => x.pos - y.pos)
    kettenKnoten.push(knoten.map((k) => k.key))
  }
  // Schritt-Felder als Fremdschlüssel
  for (const st of alleSchritte) {
    for (const k of st.keys) {
      if (k.type !== 'fk' || !k.refTableId || !k.refColumnId) continue
      const targetKind = kindByTableId.get(k.refTableId)
      if (!targetKind) continue
      const colName = st.columns.find((c) => c.id === k.columnId)?.name ?? k.columnId
      lines.push({
        sourceKey: `s:${st.id}:${k.columnId}`,
        targetKey: `${targetKind}:${k.refTableId}:${k.refColumnId}`,
        label: k.label ?? colName,
        n1: true,
        kardinalitaet: (k.kardinalitaet as any) || '1:n',
        keyKind: 's',
        keyTableId: st.id,
        keyColumnId: k.columnId,
        offset: k.offset ?? 0,
      })
    }
  }
  // Schleifen (Rücksprünge mit Bedingung) – Ziel kann ein Schritt oder ein variabler Block sein
  const loops: { sourceKey: string; targetKey: string; label: string }[] = []
  const blockIds = new Set(alleBloecke.map((b) => b.id))
  for (const st of alleSchritte) {
    if (!st.loopTargetId) continue
    loops.push({
      sourceKey: `s:${st.id}:auftragsnummer`,
      targetKey: blockIds.has(st.loopTargetId)
        ? `b:${st.loopTargetId}`
        : `s:${st.loopTargetId}:auftragsnummer`,
      label: '⟲ Schleife',
    })
  }

  // Prozessfolge für den verfolgten Auftrag. Feste Schritte liefern Maschinen-Stopps,
  // ein beteiligter Variabler Block wird als Ganzes angesteuert (nur zum Block).
  const prozessStops: string[] = []
  if (trace) {
    const eintragVon = (m: (typeof alleMaschinen)[number]) =>
      m.rows.find((r) => r.auftragsnummer === auftrag)
    for (const a of abteilungen) {
      const knoten: { pos: number; istBlock: boolean; id: string }[] = []
      for (const st of alleSchritte.filter((s) => s.abteilungId === a.id && !s.blockId)) {
        knoten.push({ id: st.id, istBlock: false, pos: st.position })
      }
      for (const b of alleBloecke.filter((x) => x.abteilungId === a.id)) {
        knoten.push({ id: b.id, istBlock: true, pos: b.position })
      }
      knoten.sort((x, y) => x.pos - y.pos)

      for (const k of knoten) {
        if (k.istBlock) {
          const beteiligt = alleSchritte.some(
            (st) =>
              st.blockId === k.id &&
              alleMaschinen.some((m) => m.schrittId === st.id && eintragVon(m)),
          )
          if (beteiligt) prozessStops.push(`bc:${k.id}`)
          continue
        }
        const ms = alleMaschinen
          .filter((m) => m.schrittId === k.id && eintragVon(m))
          .sort((x, y) => {
            const rx = eintragVon(x)
            const ry = eintragVon(y)
            return `${rx?.datum ?? ''}T${rx?.zeit ?? ''}`.localeCompare(
              `${ry?.datum ?? ''}T${ry?.zeit ?? ''}`,
            )
          })
        for (const m of ms) prozessStops.push(`mc:${m.id}`)
      }
    }
  }

  const dragSource = dragPos ? boxes[dragPos.sourceKey] : undefined
  const dragLine =
    dragPos && dragSource
      ? (() => {
          const px = dragPos.x - origin.left
          const py = dragPos.y - origin.top
          const x1 = dragSource.x + dragSource.w
          const y1 = dragSource.y + dragSource.h / 2
          return orthogonalPath(x1, y1, px, py)
        })()
      : undefined

  // Feste Spuren-Routing (Lane Routing) berechnen
  const { connections: laneConnections, junctionDots } = computeLaneRouting(lines, boxes)

  return (
    <div ref={containerRef} className="relative flex flex-col gap-6" onContextMenu={onKontextMenue}>
      {/* Abteilungsfarben – liegen hinter den Beziehungslinien */}
      {abteilungen.map((a, i) => {
        const r = boxes[`abt:${a.id}`]
        if (!r) return null
        return (
          <div
            key={`abtfarbe-${a.id}`}
            className={`pointer-events-none absolute z-0 rounded-xl border ${abteilungFarbe(i)}`}
            style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
          />
        )
      })}

      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
        <defs>
          <marker id="er-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" />
          </marker>
          <marker id="er-loop-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#c45004" />
          </marker>
          <marker id="er-prozess-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#F56405" />
          </marker>
        </defs>
        {(() => {
          const halo = { paintOrder: 'stroke' as const, stroke: '#ffffff', strokeWidth: 3 }
          return (
            <g>
              {laneConnections.map((conn) => {
                const isHovered = hoveredConnId === conn.id
                const [sCard, tCard] = (conn.kardinalitaet || 'n:1').split(':')
                const sLabel = sCard || 'n'
                const tLabel = tCard || '1'
                const sX = conn.ltr ? conn.x1 + 6 : conn.x1 - 6
                const tX = conn.ltr ? conn.x2 - 6 : conn.x2 + 6
                const strokeColor = isHovered ? '#2563eb' : conn.color
                const strokeWidth = isHovered ? 2.5 : 1.5

                return (
                  <g
                    key={conn.id}
                    opacity={hoveredConnId && !isHovered ? 0.25 : 1}
                    className="transition-opacity duration-150"
                  >
                    <path
                      d={conn.path}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      fill="none"
                      strokeLinejoin="round"
                    />
                    {/* Kardinalität Quell-Seite */}
                    <text
                      x={sX}
                      y={conn.y1 - 4}
                      textAnchor={conn.ltr ? 'start' : 'end'}
                      fontSize={10}
                      fontWeight={700}
                      fill={strokeColor}
                      style={halo}
                    >
                      {sLabel}
                    </text>
                    {/* Kardinalität Ziel-Seite */}
                    <text
                      x={tX}
                      y={conn.y2 - 4}
                      textAnchor={conn.ltr ? 'end' : 'start'}
                      fontSize={10}
                      fontWeight={700}
                      fill={strokeColor}
                      style={halo}
                    >
                      {tLabel}
                    </text>
                  </g>
                )
              })}
              {/* Abzweig-Punkte (Junction Dots) an gemeinsamen Ziel-Achsen */}
              {junctionDots.map((jd, i) => (
                <circle key={`jd-${i}`} cx={jd.x} cy={jd.y} r={2.5} fill="#64748b" />
              ))}
            </g>
          )
        })()}

        {/* Prozesskette: mittig unten vom Schritt zum mittig oben des nächsten Schritts (nur abwärts) */}
        {kettenKnoten.map((knoten, gi) => {
          const sortiert = knoten
            .map((k) => ({ key: k, box: boxes[k] }))
            .filter((x): x is { key: string; box: Rect } => !!x.box)
            .sort((a, b) => a.box.y - b.box.y)
          return sortiert.slice(0, -1).map((x, i) => {
            const von = x.box
            const nach = sortiert[i + 1].box
            const vx = von.x + von.w / 2
            const vy = von.y + von.h
            const nx = nach.x + nach.w / 2
            const ny = nach.y
            if (ny <= vy - 2) return null
            const d =
              Math.abs(vx - nx) < 4
                ? `M ${vx} ${vy} V ${ny}`
                : `M ${vx} ${vy} V ${(vy + ny) / 2} H ${nx} V ${ny}`
            return <path key={`kette-${gi}-${i}`} d={d} stroke="#475569" strokeWidth={2} fill="none" />
          })
        })}
        {loops.map((lp, i) => {
          const from = boxes[lp.sourceKey]
          const to = boxes[lp.targetKey]
          if (!from || !to) return null
          return <LoopLine key={`loop-${i}`} from={from} to={to} label={lp.label} />
        })}
        {/* Prozesspfeile: Arbeitsplatz → nächster Arbeitsplatz bzw. Variabler Block, prägnant orange */}
        {prozessStops.slice(0, -1).map((key, i) => {
          const from = boxes[key]
          const to = boxes[prozessStops[i + 1]]
          if (!from || !to) return null
          return (
            <path
              key={`prozess-${i}`}
              d={prozessPfad(from, to)}
              stroke="#F56405"
              strokeWidth={2.5}
              fill="none"
              markerEnd="url(#er-prozess-arrow)"
            />
          )
        })}
        {dragLine && (
          <path d={dragLine} stroke="#c45004" strokeWidth={2} fill="none" strokeDasharray="4 3" />
        )}
      </svg>

      {/* Greifpunkte und Kardinalitäts-Badges der Beziehungen (über den Karten) */}
      <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full">
        {laneConnections.map((conn) => {
          const isHovered = hoveredConnId === conn.id
          return (
            <g
              key={`h-${conn.id}`}
              onMouseEnter={() => setHoveredConnId(conn.id)}
              onMouseLeave={() => setHoveredConnId(null)}
            >
              {/* Greifpunkt zum Verschieben der Lane */}
              <circle
                cx={conn.handleX}
                cy={conn.handleY}
                r={12}
                fill="transparent"
                pointerEvents="all"
                style={{ cursor: 'ew-resize' }}
                onPointerDown={startLinienDrag(conn)}
              >
                <title>Linie ziehen: Spur / Versatz anpassen</title>
              </circle>
              <circle
                cx={conn.handleX}
                cy={conn.handleY}
                r={isHovered ? 4.5 : 3.5}
                fill={isHovered ? '#2563eb' : conn.color}
                pointerEvents="none"
              />

              {/* Klickbares Kardinalitäts-Badge auf der Lane */}
              <g
                transform={`translate(${conn.handleX}, ${conn.handleY - 14})`}
                pointerEvents="all"
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation()
                  setKardinalitaetMenue({
                    x: e.clientX,
                    y: e.clientY,
                    conn,
                  })
                }}
              >
                <rect
                  x={-15}
                  y={-8}
                  width={30}
                  height={16}
                  rx={8}
                  fill={isHovered ? '#eff6ff' : '#ffffff'}
                  stroke={isHovered ? '#2563eb' : '#94a3b8'}
                  strokeWidth={isHovered ? 1.5 : 1}
                  className="shadow-xs"
                />
                <text
                  x={0}
                  y={3.5}
                  textAnchor="middle"
                  fontSize={8.5}
                  fontWeight={700}
                  fill={isHovered ? '#2563eb' : '#475569'}
                >
                  {conn.kardinalitaet}
                </text>
                <title>Klick: Kardinalität anpassen (aktuell: {conn.kardinalitaet})</title>
              </g>
            </g>
          )
        })}
      </svg>

      <div className="relative z-20 flex flex-col gap-6">
        {abteilungen.map((a) => {
          const schritte = alleSchritte.filter((st) => st.abteilungId === a.id)
          const neben = alleNeben.filter((n) => n.abteilungId === a.id).sort((x, y) => (x.position ?? 0) - (y.position ?? 0))
          const bloecke = alleBloecke.filter((b) => b.abteilungId === a.id)

          // Render-Reihenfolge: Kettenknoten (feste Schritte + Blöcke) nach Position sortiert
          const renderItems: (
            | { type: 'schritt'; st: (typeof alleSchritte)[number] }
            | { type: 'block'; block: (typeof alleBloecke)[number] }
          )[] = []
          for (const st of schritte.filter((x) => !x.blockId)) renderItems.push({ type: 'schritt', st })
          for (const block of bloecke) renderItems.push({ type: 'block', block })
          renderItems.sort((a, b) => {
            const posA = a.type === 'schritt' ? a.st.position : a.block.position
            const posB = b.type === 'schritt' ? b.st.position : b.block.position
            return posA - posB
          })

          return (
            <section
              key={a.id}
              ref={registerRef(`abt:${a.id}`)}
              className="relative rounded-xl p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-1 rounded-full bg-zollern-500" />
                <button
                  onClick={() => setInfoAbt(a.id)}
                  className="rounded border border-slate-300 bg-white/70 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-white"
                  title="Info anzeigen"
                >
                  Info
                </button>
                <button
                  onClick={() => kopiereAbteilung(a.id)}
                  className="rounded border border-slate-300 bg-white/70 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-white"
                  title="Abteilung kopieren (in eine andere Kette einfügbar)"
                >
                  ⧉ Kopieren
                </button>
                <EditableName
                  value={a.name}
                  onCommit={(name) => renameAbteilung(a.id, name)}
                  className="min-w-0 flex-1 bg-transparent text-lg font-bold text-zollern-800 outline-none"
                />
                <button
                  onClick={() => addSchritt(a.id)}
                  className="rounded bg-zollern-700 px-3 py-1 text-xs font-medium text-white hover:bg-zollern-800"
                >
                  + Schritt
                </button>
                <button
                  onClick={() => addBearbeitungsblock(a.id)}
                  className="rounded border border-zollern-700 px-3 py-1 text-xs font-medium text-zollern-700 hover:bg-zollern-50"
                >
                  + Variabler Block
                </button>
                <select
                  value={a.parentId ?? ''}
                  onChange={(e) => setAbteilungParent(a.id, e.target.value || null)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600"
                  title="Übergeordnete Abteilung"
                >
                  <option value="">keine übergeordnete</option>
                  {abteilungen
                    .filter((x) => x.id !== a.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => removeAbteilung(a.id)}
                  className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Abteilung löschen"
                >
                  ✕
                </button>
              </div>

                            <div
                className="grid items-start gap-x-6 gap-y-6"
                style={{ gridTemplateColumns: 'minmax(0, 50fr) minmax(0, 20fr) minmax(0, 30fr)' }}
              >
                {/* Spalte 1 (Links, 50%): Produktbezogene Daten */}
                <div className="border-b border-slate-200 pb-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Produktbezogene Daten
                  </div>
                </div>

                {/* Spalte 2 (Mitte, 20%): Produktionskette */}
                <div className="border-b border-slate-200 pb-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Produktionskette
                  </div>
                </div>

                {/* Spalte 3 (Rechts, 30%): Prozessbezogene Daten */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Prozessbezogene Daten
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => einfuegenNebentabelle(a.id)}
                      className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                      title="Kopierte Prozess-Tabelle hier einfügen"
                    >
                      ⧉ Einfügen
                    </button>
                    <button
                      onClick={() => addNebentabelle(a.id)}
                      className="rounded bg-slate-700 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-slate-800"
                      title="Neue Prozessbezogene Tabelle anlegen"
                    >
                      + Prozess-Tabelle
                    </button>
                  </div>
                </div>

                {renderItems.map((item, i) => {
                  if (item.type === 'block') {
                    // Rechts verankert: der erste (älteste) Schritt steht rechts, neue kommen nach links
                    const blockSteps = schritte
                      .filter((x) => x.blockId === item.block.id)
                      .sort((x, y) => y.position - x.position)
                    const blockStepIds = new Set(blockSteps.map((s) => s.id))
                    const blockNeben = neben.filter((n) => {
                      if (n.schrittId && blockStepIds.has(n.schrittId)) return true
                      // Falls es keine festen Schritte gibt, nicht zugeordnete Nebentabellen beim ersten Block anzeigen
                      if (
                        (!n.schrittId || !schritte.some((s) => s.id === n.schrittId)) &&
                        !schritte.some((s) => !s.blockId) &&
                        i === 0
                      ) {
                        return true
                      }
                      return false
                    })
                    return (
                      <Fragment key={`block-group-${item.block.id}`}>
                        {/* 1. & 2. Variabler Block (Spalte 1 & 2: Produktbezogene Daten + Produktionskette, col-span-2) */}
                        <div
                          ref={registerRef(`bc:${item.block.id}`)}
                          className="col-span-2 rounded-lg border border-zollern-200 bg-zollern-50/40 p-3"
                        >
                          <div ref={registerRef(`b:${item.block.id}`)} className="mb-2 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-zollern-400" />
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-zollern-500">
                              Variabler Block
                            </span>
                            <EditableName
                              value={item.block.name}
                              onCommit={(name) => renameBearbeitungsblock(item.block.id, name)}
                              className="min-w-0 flex-1 text-xs font-semibold text-zollern-800 outline-none"
                            />
                            <button
                              onClick={() => moveBearbeitungsblock(item.block.id, 'up')}
                              disabled={i === 0}
                              className="rounded px-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                              title="Block nach oben"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveBearbeitungsblock(item.block.id, 'down')}
                              disabled={i === renderItems.length - 1}
                              className="rounded px-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                              title="Block nach unten"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => addSchritt(a.id, item.block.id)}
                              className="rounded bg-zollern-700 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-zollern-800"
                            >
                              + Schritt
                            </button>
                            <button
                              onClick={() => removeBearbeitungsblock(item.block.id)}
                              className="rounded px-1 text-slate-400 hover:text-red-500"
                              title="Block löschen"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Schritte als Spalten, rechts verankert (neue Schritte kommen nach links) */}
                          <div className="overflow-x-auto pb-1" style={{ direction: 'rtl' }}>
                            <div className="flex items-start gap-3" style={{ direction: 'ltr' }}>
                              {blockSteps.map((bst) => {
                                const bstepMaschinen = alleMaschinen.filter((m) => m.schrittId === bst.id)
                                const agg = aggregate ? aggregateSchritt(bst, bstepMaschinen, filter) : null
                                return (
                                  <div key={bst.id} className="flex w-96 shrink-0 flex-col gap-2">
                                    <EntityCard
                                      title={bst.name}
                                      onRename={(name) => renameSchritt(bst.id, name)}
                                      onRemove={() => removeSchritt(bst.id)}
                                      onAddColumn={(name, type) => addColumnSchritt(bst.id, name, type)}
                                      rahmen="normal"
                                      betont
                                      kopfExtra={
                                        <span className="flex shrink-0 items-center gap-0.5">
                                          <button
                                            onClick={() => moveBlockSchritt(bst.id, 'links')}
                                            className="rounded px-1 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                            title="Nach links verschieben"
                                          >
                                            ◀
                                          </button>
                                          <button
                                            onClick={() => moveBlockSchritt(bst.id, 'rechts')}
                                            className="rounded px-1 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                            title="Nach rechts verschieben"
                                          >
                                            ▶
                                          </button>
                                        </span>
                                      }
                                    >
                                      {SCHRITT_TABELLE_SPALTEN.map((c) => (
                                        <div
                                          key={c.id}
                                          ref={registerRef(`s:${bst.id}:${c.id}`)}
                                          data-column-node={`s:${bst.id}:${c.id}`}
                                          className="flex items-center gap-1 border-t border-slate-50 px-2 py-1"
                                        >
                                          <span className="min-w-0 flex-1 text-[10px] font-medium text-slate-700">
                                            {c.name}
                                          </span>
                                          {c.id !== 'auftragsnummer' && (
                                            <span className="text-[8px] uppercase text-slate-400">
                                              {c.type}
                                            </span>
                                          )}
                                          {c.id === 'auftragsnummer' && (
                                            <KeyBadge type="pk" info={`s:${bst.id}:${c.id}`} />
                                          )}
                                          {c.id === 'auftragsnummer' && (
                                            <span
                                              onPointerDown={startDrag('s', bst.id, 'auftragsnummer', 'pk')}
                                              className="h-3 w-3 shrink-0 cursor-grab rounded-full bg-emerald-500 hover:bg-emerald-600"
                                              title="Primärschlüssel – ziehen, um zu verbinden"
                                            />
                                          )}
                                        </div>
                                      ))}
                                      {bst.columns.map((c) => (
                                        <ColumnRow
                                          key={c.id}
                                          nodeKey={`s:${bst.id}:${c.id}`}
                                          registerRef={registerRef}
                                          col={c}
                                          keyType={keyTypeOf(bst.keys, c.id)}
                                          onRename={(name) => renameColumnSchritt(bst.id, c.id, name)}
                                          onChangeType={(t) => changeColumnTypeSchritt(bst.id, c.id, t)}
                                          onRemove={() => removeColumnSchritt(bst.id, c.id)}
                                          onCycleKey={() =>
                                            setColumnKeySchritt(bst.id, c.id, nextKey(keyTypeOf(bst.keys, c.id)))
                                          }
                                          onStartDrag={startDrag('s', bst.id, c.id, keyTypeOf(bst.keys, c.id))}
                                        />
                                      ))}
                                      {/* Zugehörigkeit + Überspringbar + Schleife (wie fester Schritt) */}
                                      <div className="border-t border-slate-100 bg-slate-50/60 px-2 py-1.5">
                                        <div className="mb-1 flex items-center gap-1">
                                          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                            Zugehörigkeit
                                          </span>
                                          <select
                                            value={bst.blockId ?? ''}
                                            onChange={(e) => setSchrittBlock(bst.id, e.target.value || null)}
                                            className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] text-slate-700"
                                            title="Schritt in einen anderen Block oder als festen Schritt verschieben"
                                          >
                                            <option value="">fester Schritt</option>
                                            {bloecke.map((b) => (
                                              <option key={b.id} value={b.id}>
                                                {b.name}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <label className="mb-1 flex items-center gap-1.5 text-[10px] text-slate-600">
                                          <input
                                            type="checkbox"
                                            checked={bst.optional}
                                            onChange={(e) => setSchrittOptional(bst.id, e.target.checked)}
                                            className="h-3 w-3 accent-zollern-600"
                                          />
                                          optional (überspringbar, wenn kein Eintrag)
                                        </label>
                                        <div className="mb-1 flex items-center gap-1">
                                          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                            Schleife
                                          </span>
                                          <select
                                            value={bst.loopTargetId ?? ''}
                                            onChange={(e) =>
                                              setSchrittLoop(bst.id, e.target.value || null, bst.loopCondition)
                                            }
                                            className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] text-slate-700"
                                            title="Ziel für Rücksprung: Schritt oder variabler Block"
                                          >
                                            <option value="">kein Rücksprung</option>
                                            <optgroup label="Schritte">
                                              {schritte
                                                .filter((x) => x.id !== bst.id)
                                                .map((x) => (
                                                  <option key={x.id} value={x.id}>
                                                    {x.name}
                                                  </option>
                                                ))}
                                            </optgroup>
                                            {bloecke.length > 0 && (
                                              <optgroup label="Variable Blöcke">
                                                {bloecke.map((b) => (
                                                  <option key={b.id} value={b.id}>
                                                    {b.name}
                                                  </option>
                                                ))}
                                              </optgroup>
                                            )}
                                          </select>
                                          {bst.loopTargetId && (
                                            <button
                                              onClick={() => setSchrittLoop(bst.id, null, null)}
                                              className="shrink-0 rounded px-1 text-slate-400 hover:text-red-500"
                                              title="Schleife entfernen"
                                            >
                                              ✕
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </EntityCard>

                                    {/* Maschinen des Block-Schritts mit vertikaler Scrollbar bei vielen Maschinen */}
                                    <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto pr-1">
                                      {bstepMaschinen.map((m, mi) => {
                                        const anteil = agg?.entries.find((e) => e.tabelle.id === m.id)
                                        const used = m.rows.some((r) => r.auftragsnummer === auftrag)
                                        const mRegisters = getTabellenRegister(m)
                                        const mVisibleCols = filterColumnsByRegister(m.columns, m.activeRegisterId)
                                        let opacity = 1
                                        if (trace) opacity = used ? 1 : 0.15
                                        else if (aggregate) opacity = opacityForPercent(anteil?.percent ?? 0)
                                        return (
                                          <div
                                            key={m.id}
                                            ref={registerRef(`mc:${m.id}`)}
                                            className="rounded-lg"
                                            style={{
                                              opacity,
                                              outline: trace && used ? '2px solid #F56405' : 'none',
                                              outlineOffset: '1px',
                                            }}
                                          >
                                            <EntityCard
                                              compact
                                              title={m.name}
                                              modus={m.modus ?? 'soll'}
                                              onModusChange={(neu) => setProduktionModus(m.id, neu)}
                                              onRename={(name) => renameProduktionstabelle(m.id, name)}
                                              onRemove={() => removeProduktionstabelle(m.id)}
                                              percent={aggregate && agg ? (anteil?.percent ?? 0) : null}
                                              colorClass={MASCHINEN_FARBEN[mi % MASCHINEN_FARBEN.length]}
                                              onAddColumn={(name, type) => addColumnProduktion(m.id, name, type)}
                                              onKopieren={() => kopiereMaschine(m.id)}
                                              registers={mRegisters}
                                              activeRegisterId={m.activeRegisterId}
                                              columns={m.columns}
                                              onSelectRegister={(regId) => setActiveRegister(m.id, regId)}
                                              onAddRegister={(name) => addRegister(m.id, name)}
                                              onRenameRegister={(regId, name) => renameRegister(m.id, regId, name)}
                                              onRemoveRegister={(regId) => removeRegister(m.id, regId)}
                                              kopfExtra={
                                                <ArbeitsplatzZeile
                                                  tabelleId={m.id}
                                                  wert={m.arbeitsplatz}
                                                  onChange={setProduktionArbeitsplatz}
                                                  dark={m.modus === 'ist'}
                                                />
                                              }
                                            >
                                              {trace && (
                                                <VerwendetHinweis
                                                  tabelle={m}
                                                  auftrag={auftrag}
                                                  inSchleife={istInSchleife(bst.id, alleSchritte, alleBloecke)}
                                                />
                                              )}
                                              {mVisibleCols.map((c) => (
                                                <ColumnRow
                                                  key={c.id}
                                                  compact
                                                  dark={m.modus === 'ist'}
                                                  nodeKey={`m:${m.id}:${c.id}`}
                                                  registerRef={registerRef}
                                                  col={c}
                                                  keyType={keyTypeOf(m.keys, c.id)}
                                                  onRename={(name) => renameColumnProduktion(m.id, c.id, name)}
                                                  onChangeType={(t) => changeColumnTypeProduktion(m.id, c.id, t)}
                                                  onRemove={() => removeColumnProduktion(m.id, c.id)}
                                                  onCycleKey={() =>
                                                    setColumnKeyProduktion(m.id, c.id, nextKey(keyTypeOf(m.keys, c.id)))
                                                  }
                                                  onStartDrag={startDrag('m', m.id, c.id, keyTypeOf(m.keys, c.id))}
                                                  registers={mRegisters}
                                                  onMoveToRegister={(targetRegId) => moveColumnToRegister(m.id, c.id, targetRegId)}
                                                />
                                              ))}
                                              {trace && used && (
                                                <div className="px-2 py-1.5">
                                                  <DurchlaufWahl
                                                    tabelle={m}
                                                    auftragsnummer={auftrag}
                                                    kompakt
                                                    dark={m.modus === 'ist'}
                                                  />
                                                </div>
                                              )}
                                            </EntityCard>
                                          </div>
                                        )
                                      })}
                                    </div>
                                    <div className="flex min-h-[2.5rem] flex-wrap items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-200 p-1">
                                      <button
                                        onClick={() => addProduktionstabelle(bst.id)}
                                        className="rounded px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                      >
                                        + Arbeitsplatz
                                      </button>
                                      <button
                                        onClick={() => addNebentabelle(a.id, undefined, bst.id)}
                                        className="rounded px-2 py-0.5 text-[11px] text-indigo-600 hover:bg-indigo-50"
                                        title="Prozess-Tabelle diesem Schritt zuordnen"
                                      >
                                        + Prozess
                                      </button>
                                      <button
                                        onClick={() => einfuegenMaschine(bst.id)}
                                        className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-600"
                                        title="Kopierte Maschinentabelle hier einfügen"
                                      >
                                        ⧉ Einfügen
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                              {blockSteps.length === 0 && (
                                <div className="rounded border border-dashed border-zollern-300 px-4 py-8 text-center text-xs text-zollern-600">
                                  Keine Schritte im Block. Klicke oben auf „+ Schritt“.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3. Prozessbezogene Daten für diesen Block (Spalte 3: 30%) */}
                        <div className="grid grid-cols-2 content-start items-start gap-2 self-start">
                          {blockNeben.map((n) => {
                            const nRegisters = getTabellenRegister(n)
                            const nVisibleCols = filterColumnsByRegister(n.columns, n.activeRegisterId)
                            return (
                              <div key={n.id} ref={registerRef(`nc:${n.id}`)} className="min-w-0">
                                <EntityCard
                                  compact
                                  title={n.name}
                                  modus={n.modus ?? 'soll'}
                                  onModusChange={(neu) => setNebenModus(n.id, neu)}
                                  onRename={(name) => renameNebentabelle(n.id, name)}
                                  onRemove={() => removeNebentabelle(n.id)}
                                  onAddColumn={(name, type) => addColumnNeben(n.id, name, type)}
                                  onKopieren={() => kopiereNebentabelle(n.id)}
                                  registers={nRegisters}
                                  activeRegisterId={n.activeRegisterId}
                                  columns={n.columns}
                                  onSelectRegister={(regId) => setActiveRegister(n.id, regId)}
                                  onAddRegister={(name) => addRegister(n.id, name)}
                                  onRenameRegister={(regId, name) => renameRegister(n.id, regId, name)}
                                  onRemoveRegister={(regId) => removeRegister(n.id, regId)}
                                  kopfExtra={
                                    <div className="flex w-full flex-col gap-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <ArbeitsplatzZeile
                                          tabelleId={n.id}
                                          wert={n.arbeitsplatz}
                                          onChange={setNebenArbeitsplatz}
                                          dark={n.modus === 'ist'}
                                        />
                                        <span className="flex shrink-0 items-center gap-0.5">
                                          <button
                                            onClick={() => moveNebenToStep(n.id, 'up')}
                                            className={`rounded px-1 text-[11px] ${
                                              n.modus === 'ist'
                                                ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                                            }`}
                                            title="Zum vorherigen Schritt verschieben"
                                          >
                                            ↑
                                          </button>
                                          <button
                                            onClick={() => moveNebenToStep(n.id, 'down')}
                                            className={`rounded px-1 text-[11px] ${
                                              n.modus === 'ist'
                                                ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                                            }`}
                                            title="Zum nächsten Schritt verschieben"
                                          >
                                            ↓
                                          </button>
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-semibold uppercase text-slate-400">Schritt:</span>
                                        <select
                                          value={n.schrittId ?? ''}
                                          onChange={(e) => setNebenSchritt(n.id, e.target.value || null)}
                                          className={`min-w-0 flex-1 truncate rounded border px-1 py-0.5 text-[10px] ${
                                            n.modus === 'ist'
                                              ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                                              : 'border-slate-300 bg-white text-slate-700'
                                          }`}
                                          title="Zugeordneter Schritt für diese Prozess-Tabelle"
                                        >
                                          <option value="">(Kein Schritt)</option>
                                          {schritte.map((s) => (
                                            <option key={s.id} value={s.id}>
                                              {s.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  }
                                >
                                  {nVisibleCols.map((c) => (
                                    <ColumnRow
                                      key={c.id}
                                      compact
                                      dark={n.modus === 'ist'}
                                      nodeKey={`n:${n.id}:${c.id}`}
                                      registerRef={registerRef}
                                      col={c}
                                      keyType={keyTypeOf(n.keys, c.id)}
                                      onRename={(name) => renameColumnNeben(n.id, c.id, name)}
                                      onChangeType={(t) => changeColumnTypeNeben(n.id, c.id, t)}
                                      onRemove={() => removeColumnNeben(n.id, c.id)}
                                      onCycleKey={() =>
                                        setColumnKeyNeben(n.id, c.id, nextKey(keyTypeOf(n.keys, c.id)))
                                      }
                                      onStartDrag={startDrag('n', n.id, c.id, keyTypeOf(n.keys, c.id))}
                                      registers={nRegisters}
                                      onMoveToRegister={(targetRegId) => moveColumnToRegister(n.id, c.id, targetRegId)}
                                    />
                                  ))}
                                </EntityCard>
                              </div>
                            )
                          })}
                          {blockNeben.length === 0 && (
                            <div className="col-span-2 flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/40 text-[11px] text-slate-400">
                              Keine Prozess-Tabellen im Block
                            </div>
                          )}
                        </div>
                      </Fragment>
                    )
                  }

                  const st = item.st
                  const firstFesterSchritt = schritte.find((x) => !x.blockId)
                  const stepNeben = neben.filter((n) => {
                    if (n.schrittId === st.id) return true
                    if (!n.schrittId || !schritte.some((s) => s.id === n.schrittId)) {
                      return firstFesterSchritt?.id === st.id
                    }
                    return false
                  })
                  const stepMaschinen = alleMaschinen.filter((m) => m.schrittId === st.id)
                  const agg = aggregate ? aggregateSchritt(st, stepMaschinen, filter) : null
                  const matchedRows = stepMaschinen.flatMap((m) => m.rows)
                  const matched = aggregate
                    ? matchedRows.filter((r) => r.fn === filter.fn.trim() || r.datum === filter.datum).length
                    : 0

                  return (
                    <Fragment key={st.id}>
                      {/* 1. Produktbezogene Daten dieses Schritts (50%) */}
                      <div className="grid grid-cols-2 content-start items-start gap-3 self-start lg:grid-cols-2 2xl:grid-cols-3">
                        {stepMaschinen.map((m, mi) => {
                          const anteil = agg?.entries.find((e) => e.tabelle.id === m.id)
                          const used = m.rows.some((r) => r.auftragsnummer === auftrag)
                          const mRegisters = getTabellenRegister(m)
                          const mVisibleCols = filterColumnsByRegister(m.columns, m.activeRegisterId)
                          let opacity = 1
                          if (trace) opacity = used ? 1 : 0.15
                          else if (aggregate) opacity = opacityForPercent(anteil?.percent ?? 0)
                          return (
                            <div
                              key={m.id}
                              ref={registerRef(`mc:${m.id}`)}
                              className="rounded-lg"
                              style={{
                                opacity,
                                outline: trace && used ? '2px solid #F56405' : 'none',
                                outlineOffset: '1px',
                              }}
                            >
                              <EntityCard
                                compact
                                title={m.name}
                                modus={m.modus ?? 'soll'}
                                onModusChange={(neu) => setProduktionModus(m.id, neu)}
                                onRename={(name) => renameProduktionstabelle(m.id, name)}
                                onRemove={() => removeProduktionstabelle(m.id)}
                                percent={aggregate && agg ? (anteil?.percent ?? 0) : null}
                                colorClass={MASCHINEN_FARBEN[mi % MASCHINEN_FARBEN.length]}
                                onAddColumn={(name, type) => addColumnProduktion(m.id, name, type)}
                                onKopieren={() => kopiereMaschine(m.id)}
                                registers={mRegisters}
                                activeRegisterId={m.activeRegisterId}
                                columns={m.columns}
                                onSelectRegister={(regId) => setActiveRegister(m.id, regId)}
                                onAddRegister={(name) => addRegister(m.id, name)}
                                onRenameRegister={(regId, name) => renameRegister(m.id, regId, name)}
                                onRemoveRegister={(regId) => removeRegister(m.id, regId)}
                                kopfExtra={
                                  <ArbeitsplatzZeile
                                    tabelleId={m.id}
                                    wert={m.arbeitsplatz}
                                    onChange={setProduktionArbeitsplatz}
                                    dark={m.modus === 'ist'}
                                  />
                                }
                              >
                                {trace && (
                                  <VerwendetHinweis
                                    tabelle={m}
                                    auftrag={auftrag}
                                    inSchleife={istInSchleife(st.id, alleSchritte, alleBloecke)}
                                  />
                                )}
                                {mVisibleCols.map((c) => (
                                  <ColumnRow
                                    key={c.id}
                                    compact
                                    dark={m.modus === 'ist'}
                                    nodeKey={`m:${m.id}:${c.id}`}
                                    registerRef={registerRef}
                                    col={c}
                                    keyType={keyTypeOf(m.keys, c.id)}
                                    onRename={(name) => renameColumnProduktion(m.id, c.id, name)}
                                    onChangeType={(t) => changeColumnTypeProduktion(m.id, c.id, t)}
                                    onRemove={() => removeColumnProduktion(m.id, c.id)}
                                    onCycleKey={() =>
                                      setColumnKeyProduktion(m.id, c.id, nextKey(keyTypeOf(m.keys, c.id)))
                                    }
                                    onStartDrag={startDrag('m', m.id, c.id, keyTypeOf(m.keys, c.id))}
                                    registers={mRegisters}
                                    onMoveToRegister={(targetRegId) => moveColumnToRegister(m.id, c.id, targetRegId)}
                                  />
                                ))}
                                {trace && used && (
                                  <div className="px-2 py-1.5">
                                    <DurchlaufWahl tabelle={m} auftragsnummer={auftrag} kompakt dark={m.modus === 'ist'} />
                                  </div>
                                )}
                              </EntityCard>
                            </div>
                          )
                        })}
                        {stepMaschinen.length === 0 && (
                          <button
                            onClick={() => addProduktionstabelle(st.id)}
                            className="col-span-2 flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/40 text-[11px] font-medium text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                            title="Arbeitsplatz für diesen Schritt anlegen"
                          >
                            + Arbeitsplatz anlegen
                          </button>
                        )}
                      </div>

                      {/* 2. Produktionskette (Schritt-Karte, 20%) */}
                      <div ref={registerRef(`sc:${st.id}`)} className="self-start">
                        <EntityCard
                          title={st.name}
                          onRename={(name) => renameSchritt(st.id, name)}
                          onRemove={() => removeSchritt(st.id)}
                          percent={aggregate && matchedRows.length > 0 ? (matched / matchedRows.length) * 100 : null}
                          onAddColumn={(name, type) => addColumnSchritt(st.id, name, type)}
                          rahmen="normal"
                          betont
                          footer={
                            <div className="flex flex-col gap-1.5 border-t border-slate-100 px-2 py-1.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <button
                                  onClick={() => addProduktionstabelle(st.id)}
                                  className="rounded bg-slate-700 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-slate-800"
                                  title="Neuen Arbeitsplatz für diesen Schritt anlegen"
                                >
                                  + Arbeitsplatz
                                </button>
                                <button
                                  onClick={() => addNebentabelle(a.id, undefined, st.id)}
                                  className="rounded border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100"
                                  title="Neue Prozess-Tabelle für diesen Schritt anlegen"
                                >
                                  + Prozess
                                </button>
                                <button
                                  onClick={() => einfuegenMaschine(st.id)}
                                  className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                                  title="Kopierte Maschinentabelle hier einfügen"
                                >
                                  ⧉ Einfügen
                                </button>
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] text-slate-400">Reihenfolge:</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => moveSchritt(st.id, 'up')}
                                    disabled={i === 0}
                                    className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                    title="Schritt nach oben"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => moveSchritt(st.id, 'down')}
                                    disabled={i === renderItems.length - 1}
                                    className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                    title="Schritt nach unten"
                                  >
                                    ↓
                                  </button>
                                </div>
                              </div>
                            </div>
                          }
                        >
                          {SCHRITT_TABELLE_SPALTEN.map((c) => (
                            <div
                              key={c.id}
                              ref={registerRef(`s:${st.id}:${c.id}`)}
                              data-column-node={`s:${st.id}:${c.id}`}
                              className="flex items-center gap-1 border-t border-slate-50 px-2 py-1"
                            >
                              <span className="min-w-0 flex-1 text-[10px] font-medium text-slate-700">
                                {c.name}
                              </span>
                              {c.id !== 'auftragsnummer' && (
                                <span className="text-[8px] uppercase text-slate-400">
                                  {c.type}
                                </span>
                              )}
                              {c.id === 'auftragsnummer' && (
                                <KeyBadge type="pk" info={`s:${st.id}:${c.id}`} />
                              )}
                              {c.id === 'auftragsnummer' && (
                                <span
                                  onPointerDown={startDrag('s', st.id, 'auftragsnummer', 'pk')}
                                  className="h-3 w-3 shrink-0 cursor-grab rounded-full bg-emerald-500 hover:bg-emerald-600"
                                  title="Primärschlüssel – ziehen, um mit einem Fremdschlüssel zu verbinden"
                                />
                              )}
                            </div>
                          ))}
                          {st.columns.map((c) => (
                            <ColumnRow
                              key={c.id}
                              nodeKey={`s:${st.id}:${c.id}`}
                              registerRef={registerRef}
                              col={c}
                              keyType={keyTypeOf(st.keys, c.id)}
                              onRename={(name) => renameColumnSchritt(st.id, c.id, name)}
                              onChangeType={(t) => changeColumnTypeSchritt(st.id, c.id, t)}
                              onRemove={() => removeColumnSchritt(st.id, c.id)}
                              onCycleKey={() =>
                                setColumnKeySchritt(st.id, c.id, nextKey(keyTypeOf(st.keys, c.id)))
                              }
                              onStartDrag={startDrag('s', st.id, c.id, keyTypeOf(st.keys, c.id))}
                            />
                          ))}
                          {/* Überspringbar (optional) + Schleife (Rücksprung mit Bedingung) */}
                          <div className="border-t border-slate-100 bg-slate-50/60 px-2 py-1.5">
                            <div className="mb-1 flex items-center gap-1">
                              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                Zugehörigkeit
                              </span>
                              <select
                                value={st.blockId ?? ''}
                                onChange={(e) => setSchrittBlock(st.id, e.target.value || null)}
                                className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] text-slate-700"
                                title="Schritt in einen Variablen Block verschieben"
                              >
                                <option value="">fester Schritt</option>
                                {bloecke.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <label className="mb-1 flex items-center gap-1.5 text-[10px] text-slate-600">
                              <input
                                type="checkbox"
                                checked={st.optional}
                                onChange={(e) => setSchrittOptional(st.id, e.target.checked)}
                                className="h-3 w-3 accent-zollern-600"
                              />
                              optional (überspringbar, wenn kein Eintrag)
                            </label>
                            <div className="mb-1 flex items-center gap-1">
                              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                Schleife
                              </span>
                              <select
                                value={st.loopTargetId ?? ''}
                                onChange={(e) =>
                                  setSchrittLoop(st.id, e.target.value || null, st.loopCondition)
                                }
                                className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] text-slate-700"
                                title="Ziel für Rücksprung: Schritt oder variabler Block"
                              >
                                <option value="">kein Rücksprung</option>
                                <optgroup label="Schritte">
                                  {schritte
                                    .filter((x) => x.id !== st.id)
                                    .map((x) => (
                                      <option key={x.id} value={x.id}>
                                        {x.name}
                                      </option>
                                    ))}
                                </optgroup>
                                {bloecke.length > 0 && (
                                  <optgroup label="Variable Blöcke">
                                    {bloecke.map((b) => (
                                      <option key={b.id} value={b.id}>
                                        {b.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                              {st.loopTargetId && (
                                <button
                                  onClick={() => setSchrittLoop(st.id, null, null)}
                                  className="shrink-0 rounded px-1 text-slate-400 hover:text-red-500"
                                  title="Schleife entfernen"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        </EntityCard>
                      </div>

                      {/* 3. Prozessbezogene Daten dieses Schritts (30% - Platz für 2 Tabellen nebeneinander) */}
                      <div className="grid grid-cols-2 content-start items-start gap-2 self-start">
                        {stepNeben.map((n) => {
                          const nRegisters = getTabellenRegister(n)
                          const nVisibleCols = filterColumnsByRegister(n.columns, n.activeRegisterId)
                          return (
                            <div key={n.id} ref={registerRef(`nc:${n.id}`)} className="min-w-0">
                              <EntityCard
                                compact
                                title={n.name}
                                modus={n.modus ?? 'soll'}
                                onModusChange={(neu) => setNebenModus(n.id, neu)}
                                onRename={(name) => renameNebentabelle(n.id, name)}
                                onRemove={() => removeNebentabelle(n.id)}
                                onAddColumn={(name, type) => addColumnNeben(n.id, name, type)}
                                onKopieren={() => kopiereNebentabelle(n.id)}
                                registers={nRegisters}
                                activeRegisterId={n.activeRegisterId}
                                columns={n.columns}
                                onSelectRegister={(regId) => setActiveRegister(n.id, regId)}
                                onAddRegister={(name) => addRegister(n.id, name)}
                                onRenameRegister={(regId, name) => renameRegister(n.id, regId, name)}
                                onRemoveRegister={(regId) => removeRegister(n.id, regId)}
                                kopfExtra={
                                  <div className="flex w-full flex-col gap-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <ArbeitsplatzZeile
                                        tabelleId={n.id}
                                        wert={n.arbeitsplatz}
                                        onChange={setNebenArbeitsplatz}
                                        dark={n.modus === 'ist'}
                                      />
                                      <span className="flex shrink-0 items-center gap-0.5">
                                        <button
                                          onClick={() => moveNebenToStep(n.id, 'up')}
                                          className={`rounded px-1 text-[11px] ${
                                            n.modus === 'ist'
                                              ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                                          }`}
                                          title="Zum vorherigen Schritt verschieben"
                                        >
                                          ↑
                                        </button>
                                        <button
                                          onClick={() => moveNebenToStep(n.id, 'down')}
                                          className={`rounded px-1 text-[11px] ${
                                            n.modus === 'ist'
                                              ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                                          }`}
                                          title="Zum nächsten Schritt verschieben"
                                        >
                                          ↓
                                        </button>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] font-semibold uppercase text-slate-400">Schritt:</span>
                                      <select
                                        value={n.schrittId ?? ''}
                                        onChange={(e) => setNebenSchritt(n.id, e.target.value || null)}
                                        className={`min-w-0 flex-1 truncate rounded border px-1 py-0.5 text-[10px] ${
                                          n.modus === 'ist'
                                            ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                                            : 'border-slate-300 bg-white text-slate-700'
                                          }`}
                                        title="Zugeordneter Schritt für diese Prozess-Tabelle"
                                      >
                                        <option value="">(Kein Schritt)</option>
                                        {schritte.map((s) => (
                                          <option key={s.id} value={s.id}>
                                            {s.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                }
                              >
                                {nVisibleCols.map((c) => (
                                  <ColumnRow
                                    key={c.id}
                                    compact
                                    dark={n.modus === 'ist'}
                                    nodeKey={`n:${n.id}:${c.id}`}
                                    registerRef={registerRef}
                                    col={c}
                                    keyType={keyTypeOf(n.keys, c.id)}
                                    onRename={(name) => renameColumnNeben(n.id, c.id, name)}
                                    onChangeType={(t) => changeColumnTypeNeben(n.id, c.id, t)}
                                    onRemove={() => removeColumnNeben(n.id, c.id)}
                                    onCycleKey={() =>
                                      setColumnKeyNeben(n.id, c.id, nextKey(keyTypeOf(n.keys, c.id)))
                                    }
                                    onStartDrag={startDrag('n', n.id, c.id, keyTypeOf(n.keys, c.id))}
                                    registers={nRegisters}
                                    onMoveToRegister={(targetRegId) => moveColumnToRegister(n.id, c.id, targetRegId)}
                                  />
                                ))}
                              </EntityCard>
                            </div>
                          )
                        })}
                        {stepNeben.length === 0 && (
                          <button
                            onClick={() => addNebentabelle(a.id, undefined, st.id)}
                            className="col-span-2 flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/40 text-[11px] font-medium text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                            title="Prozessbezogene Tabelle für diesen Schritt anlegen"
                          >
                            + Prozess-Tabelle zuweisen
                          </button>
                        )}
                        {stepNeben.length === 1 && (
                          <button
                            onClick={() => addNebentabelle(a.id, undefined, st.id)}
                            className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/40 text-[10px] font-medium text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                            title="Zweite Prozessbezogene Tabelle für diesen Schritt anlegen"
                          >
                            + 2. Tabelle
                          </button>
                        )}
                      </div>
                    </Fragment>
                  )
                })}

                {renderItems.length === 0 && (
                  <>
                    <div className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-400">
                      Keine Arbeitsplätze
                    </div>
                    <div className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-400">
                      Keine Schritte
                    </div>
                    <div className="grid grid-cols-2 content-start items-start gap-2 self-start">
                      {neben.map((n) => {
                        const nRegisters = getTabellenRegister(n)
                        const nVisibleCols = filterColumnsByRegister(n.columns, n.activeRegisterId)
                        return (
                          <div key={n.id} ref={registerRef(`nc:${n.id}`)} className="min-w-0">
                            <EntityCard
                              compact
                              title={n.name}
                              modus={n.modus ?? 'soll'}
                              onModusChange={(neu) => setNebenModus(n.id, neu)}
                              onRename={(name) => renameNebentabelle(n.id, name)}
                              onRemove={() => removeNebentabelle(n.id)}
                              onAddColumn={(name, type) => addColumnNeben(n.id, name, type)}
                              onKopieren={() => kopiereNebentabelle(n.id)}
                              registers={nRegisters}
                              activeRegisterId={n.activeRegisterId}
                              columns={n.columns}
                              onSelectRegister={(regId) => setActiveRegister(n.id, regId)}
                              onAddRegister={(name) => addRegister(n.id, name)}
                              onRenameRegister={(regId, name) => renameRegister(n.id, regId, name)}
                              onRemoveRegister={(regId) => removeRegister(n.id, regId)}
                              kopfExtra={
                                <ArbeitsplatzZeile
                                  tabelleId={n.id}
                                  wert={n.arbeitsplatz}
                                  onChange={setNebenArbeitsplatz}
                                  dark={n.modus === 'ist'}
                                />
                              }
                            >
                              {nVisibleCols.map((c) => (
                                <ColumnRow
                                  key={c.id}
                                  compact
                                  dark={n.modus === 'ist'}
                                  nodeKey={`n:${n.id}:${c.id}`}
                                  registerRef={registerRef}
                                  col={c}
                                  keyType={keyTypeOf(n.keys, c.id)}
                                  onRename={(name) => renameColumnNeben(n.id, c.id, name)}
                                  onChangeType={(t) => changeColumnTypeNeben(n.id, c.id, t)}
                                  onRemove={() => removeColumnNeben(n.id, c.id)}
                                  onCycleKey={() =>
                                    setColumnKeyNeben(n.id, c.id, nextKey(keyTypeOf(n.keys, c.id)))
                                  }
                                  onStartDrag={startDrag('n', n.id, c.id, keyTypeOf(n.keys, c.id))}
                                  registers={nRegisters}
                                  onMoveToRegister={(targetRegId) => moveColumnToRegister(n.id, c.id, targetRegId)}
                                />
                              ))}
                            </EntityCard>
                          </div>
                        )
                      })}
                      {neben.length === 0 && (
                        <div className="col-span-2 rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
                          Keine Prozess-Tabellen
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          )
        })}
      </div>
      {infoAbt && <InfoModal abteilungId={infoAbt} onClose={() => setInfoAbt(null)} />}

      {/* Popover zur Einstellung der Kardinalität (1:n, n:1, 1:1, n:m) */}
      {kardinalitaetMenue && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setKardinalitaetMenue(null)}
          />
          <div
            className="fixed z-50 min-w-[14rem] rounded-lg border border-slate-200 bg-white p-3 shadow-xl select-none"
            style={{
              left: Math.max(8, Math.min(kardinalitaetMenue.x - 70, window.innerWidth - 240)),
              top: Math.max(8, Math.min(kardinalitaetMenue.y - 10, window.innerHeight - 200)),
            }}
          >
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="text-[11px] font-bold text-slate-800">Beziehung anpassen</span>
              <button
                onClick={() => setKardinalitaetMenue(null)}
                className="rounded px-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="mb-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Kardinalität:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'n:1', label: 'n : 1', desc: 'Viele zu Einem' },
                  { id: '1:n', label: '1 : n', desc: 'Eins zu Vielen' },
                  { id: '1:1', label: '1 : 1', desc: 'Eins zu Einem' },
                  { id: 'n:m', label: 'n : m', desc: 'Viele zu Vielen' },
                ].map((c) => {
                  const isSelected = kardinalitaetMenue.conn.kardinalitaet === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setBeziehungKardinalitaet(
                          kardinalitaetMenue.conn.keyKind,
                          kardinalitaetMenue.conn.keyTableId,
                          kardinalitaetMenue.conn.keyColumnId,
                          c.id,
                        )
                        setKardinalitaetMenue(null)
                      }}
                      className={`flex flex-col items-center rounded border px-2 py-1 text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-zollern-600 bg-zollern-50 text-zollern-800 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold">{c.label}</span>
                      <span className="text-[8px] text-slate-400">{c.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-1.5">
              <button
                type="button"
                onClick={() => {
                  loescheBeziehung(
                    kardinalitaetMenue.conn.keyKind,
                    kardinalitaetMenue.conn.keyTableId,
                    kardinalitaetMenue.conn.keyColumnId,
                  )
                  setKardinalitaetMenue(null)
                }}
                className="w-full rounded px-2 py-1 text-center text-[10px] font-medium text-red-600 hover:bg-red-50 cursor-pointer"
              >
                ✕ Beziehung lösen / entfernen
              </button>
            </div>
          </div>
        </>
      )}

      {menue && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenue(null)}
            onContextMenu={(ev) => {
              ev.preventDefault()
              setMenue(null)
            }}
          />
          <div
            className="fixed z-50 min-w-[15rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            style={{ left: menue.x, top: menue.y }}
          >
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Beziehungen
            </div>
            {menue.eintraege.map((en, i) => (
              <button
                key={i}
                onClick={() => {
                  loescheBeziehung(en.kind, en.tableId, en.columnId)
                  setMenue(null)
                }}
                className="block w-full px-2 py-1 text-left text-xs text-slate-700 hover:bg-red-50 hover:text-red-600"
              >
                {en.text}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
