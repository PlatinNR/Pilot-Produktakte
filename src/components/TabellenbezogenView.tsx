import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import type {
  ColumnType,
  Filter,
  KeyType,
  TableColumn,
} from '../types'
import { COLUMN_TYPE_LABELS, SCHRITT_TABELLE_SPALTEN } from '../types'
import { useStore } from '../store'
import {
  aggregateSchritt,
  formatPercent,
  isAggregateMode,
  isTraceMode,
  MASCHINEN_FARBEN,
} from '../utils/aggregate'
import { EditableName } from './EditableName'
import { KeyBadge } from './KeyBadge'
import { keyTypeOf, nextKey } from '../utils/keys'

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

function ColumnLabel({ children }: { children: string }) {
  return (
    <div className="mb-2 border-b border-slate-200 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </div>
  )
}

function orthogonalPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2
  return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`
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
}) {
  return (
    <div
      ref={registerRef(nodeKey)}
      data-column-node={nodeKey}
      className={`flex items-center gap-1 border-t border-slate-50 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}
    >
      {keyType === 'fk' && (
        <span
          onPointerDown={onStartDrag}
          className="h-3 w-3 shrink-0 cursor-grab rounded-full border-2 border-white bg-zollern-500 shadow hover:bg-zollern-600"
          title="Fremdschlüssel – ziehen, um Verbindung zu erstellen"
        />
      )}
      {col.fixed ? (
        <span className={`min-w-0 flex-1 font-medium text-slate-700 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{col.name}</span>
      ) : (
        <EditableName
          value={col.name}
          onCommit={onRename}
          className={`min-w-0 flex-1 bg-transparent text-slate-700 outline-none ${compact ? 'text-[10px]' : 'text-[11px]'}`}
        />
      )}
      <select
        value={col.type}
        onChange={(e) => onChangeType(e.target.value as ColumnType)}
        className="rounded border border-slate-200 px-0.5 py-0 text-[9px] text-slate-500"
        title="Spaltentyp"
      >
        {(Object.keys(COLUMN_TYPE_LABELS) as ColumnType[]).map((t) => (
          <option key={t} value={t}>
            {COLUMN_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <KeyBadge type={keyType} onClick={onCycleKey} />
      {keyType === 'pk' && (
        <span
          onPointerDown={onStartDrag}
          className="h-3 w-3 shrink-0 cursor-grab rounded-full border-2 border-white bg-emerald-500 shadow hover:bg-emerald-600"
          title="Primärschlüssel – ziehen, um mit einem Fremdschlüssel zu verbinden"
        />
      )}
      {!col.fixed && (
        <button onClick={onRemove} className="text-slate-300 hover:text-red-500" title="Spalte löschen">
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
}: EntityProps) {
  const [addingCol, setAddingCol] = useState(false)
  const [colName, setColName] = useState('')
  const [colType, setColType] = useState<ColumnType>('text')

  const submitColumn = () => {
    const trimmed = colName.trim()
    if (!trimmed) return
    onAddColumn?.(trimmed, colType)
    setColName('')
    setColType('text')
    setAddingCol(false)
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className={`flex items-center gap-1.5 border-b border-slate-100 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1.5'}`}>
        <span className="h-2 w-2 shrink-0 rounded-full bg-zollern-500" />
        <EditableName
          value={title}
          onCommit={onRename}
          className={`min-w-0 flex-1 bg-transparent font-semibold text-slate-700 outline-none ${compact ? 'text-[11px]' : 'text-xs'}`}
        />
        {typeof percent === 'number' && percent >= 0 && (
          <span className="shrink-0 rounded-full bg-zollern-50 px-1.5 py-0.5 text-[10px] font-bold text-zollern-700">
            {formatPercent(percent)}
          </span>
        )}
        <button
          onClick={onRemove}
          className="shrink-0 rounded px-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
          title="Löschen"
        >
          ✕
        </button>
      </div>
      {typeof percent === 'number' && percent >= 0 && (
        <div className="h-0.5 w-full bg-slate-100">
          <div className={`h-full ${colorClass ?? 'bg-zollern-500'}`} style={{ width: `${percent}%` }} />
        </div>
      )}
      <div>{children}</div>
      {onAddColumn && (
        <div className="border-t border-slate-100">
          {addingCol ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                className="min-w-0 flex-1 rounded border border-slate-200 px-1.5 py-0.5 text-[10px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitColumn()
                  if (e.key === 'Escape') setAddingCol(false)
                }}
              />
              <select
                value={colType}
                onChange={(e) => setColType(e.target.value as ColumnType)}
                className="rounded border border-slate-200 px-0.5 py-0.5 text-[10px]"
              >
                <option value="text">Text</option>
                <option value="number">Zahl</option>
                <option value="date">Datum</option>
              </select>
              <button onClick={submitColumn} className="rounded bg-zollern-700 px-1.5 py-0.5 text-[10px] text-white hover:bg-zollern-800">
                ✓
              </button>
              <button onClick={() => setAddingCol(false)} className="rounded px-1 text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              className="w-full px-2 py-1 text-left text-[10px] font-medium text-zollern-700 hover:bg-zollern-50"
            >
              + Feld
            </button>
          )}
        </div>
      )}
      {footer}
    </div>
  )
}

interface Geo {
  path: string
  x1: number
  y1: number
  x2: number
  y2: number
  labelX: number
  labelY: number
}

function computeLine(from: Rect, to: Rect): Geo {
  const sameColumn = Math.abs(from.x - to.x) < 24
  let x1: number
  let y1: number
  let x2: number
  let y2: number
  let path: string
  let labelX: number
  let labelY: number
  if (sameColumn) {
    const channel = Math.max(from.x, to.x) + Math.max(from.w, to.w) + 16
    x1 = from.x + from.w
    y1 = from.y + from.h / 2
    x2 = to.x + to.w
    y2 = to.y + to.h / 2
    path = `M ${x1} ${y1} H ${channel} V ${y2} H ${x2}`
    labelX = channel
    labelY = (y1 + y2) / 2
  } else {
    const ltr = from.x <= to.x
    x1 = ltr ? from.x + from.w : from.x
    y1 = from.y + from.h / 2
    x2 = ltr ? to.x : to.x + to.w
    y2 = to.y + to.h / 2
    const midX = (x1 + x2) / 2
    path = `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`
    labelX = midX
    labelY = Math.min(y1, y2) - 8
  }
  return { path, x1, y1, x2, y2, labelX, labelY }
}

function RelationshipLine({ geo, n1 }: { geo: Geo; n1: boolean }) {
  const halo = { paintOrder: 'stroke' as const, stroke: '#ffffff', strokeWidth: 3 }
  return (
    <g>
      <path d={geo.path} stroke="#94a3b8" strokeWidth={1.5} fill="none" markerEnd="url(#er-arrow)" />
      {n1 && (
        <text x={geo.x1 < geo.x2 ? geo.x1 + 8 : geo.x1 - 8} y={geo.y1 - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#c45004" style={halo}>
          n
        </text>
      )}
      {n1 && (
        <text x={geo.x1 < geo.x2 ? geo.x2 - 8 : geo.x2 + 8} y={geo.y2 - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#c45004" style={halo}>
          1
        </text>
      )}
    </g>
  )
}

export function TabellenbezogenView({ filter }: Props) {
  const alleAbteilungen = useStore((s) => s.abteilungen)
  const activeChainId = useStore((s) => s.activeChainId)
  const alleSchritte = useStore((s) => s.schritte)
  const alleMaschinen = useStore((s) => s.produktionstabellen)
  const alleNeben = useStore((s) => s.nebentabellen)

  const abteilungen = alleAbteilungen.filter((a) => a.chainId === activeChainId)

  const {
    addSchritt,
    renameSchritt,
    removeSchritt,
    moveSchritt,
    addColumnSchritt,
    renameColumnSchritt,
    changeColumnTypeSchritt,
    removeColumnSchritt,
    setColumnKeySchritt,
    linkSchrittFK,
    renameAbteilung,
    removeAbteilung,
    addProduktionstabelle,
    renameProduktionstabelle,
    removeProduktionstabelle,
    addColumnProduktion,
    renameColumnProduktion,
    changeColumnTypeProduktion,
    removeColumnProduktion,
    setColumnKeyProduktion,
    linkProduktionFK,
    addNebentabelle,
    renameNebentabelle,
    removeNebentabelle,
    addColumnNeben,
    renameColumnNeben,
    changeColumnTypeNeben,
    removeColumnNeben,
    setColumnKeyNeben,
    linkNebenFK,
  } = useStore()

  const trace = isTraceMode(filter)
  const aggregate = isAggregateMode(filter)
  const auftrag = filter.auftragsnummer.trim()

  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef(new Map<string, HTMLDivElement>())
  const [boxes, setBoxes] = useState<Record<string, Rect>>({})
  const [origin, setOrigin] = useState({ left: 0, top: 0 })
  const [dragPos, setDragPos] = useState<{ x: number; y: number; sourceKey: string } | null>(null)

  const registerRef = (nodeKey: string) => (el: HTMLDivElement | null) => {
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
  }, [alleAbteilungen, alleSchritte, alleMaschinen, alleNeben])

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

  const startDrag =
    (kind: 'm' | 'n' | 's', tableId: string, columnId: string, keyType: KeyType | null) =>
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const sourceKey = `${kind}:${tableId}:${columnId}`
      setDragPos({ x: e.clientX, y: e.clientY, sourceKey })

      const move = (ev: PointerEvent) => setDragPos({ x: ev.clientX, y: ev.clientY, sourceKey })
      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
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

  const kindByTableId = new Map<string, string>()
  for (const m of alleMaschinen) kindByTableId.set(m.id, 'm')
  for (const st of alleSchritte) kindByTableId.set(st.id, 's')
  for (const n of alleNeben) kindByTableId.set(n.id, 'n')

  interface LineDef {
    sourceKey: string
    targetKey: string
    label: string
    n1: boolean
    keyKind: 'm' | 'n' | 's' | null
    keyTableId: string | null
    keyColumnId: string | null
  }

  const lines: LineDef[] = []
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
        n1: k.columnId !== 'datum',
        keyKind: 'm',
        keyTableId: m.id,
        keyColumnId: k.columnId,
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
        n1: false,
        keyKind: 'n',
        keyTableId: n.id,
        keyColumnId: k.columnId,
      })
    }
  }
  // Schritt -> Schritt (Prozesskette: der Fertigungsauftrag wandert durch die Schritte)
  for (const a of abteilungen) {
    const schritte = alleSchritte.filter((st) => st.abteilungId === a.id)
    for (let i = 0; i < schritte.length - 1; i++) {
      lines.push({
        sourceKey: `s:${schritte[i].id}:auftragsnummer`,
        targetKey: `s:${schritte[i + 1].id}:auftragsnummer`,
        label: 'Auftragsnummer',
        n1: false,
        keyKind: null,
        keyTableId: null,
        keyColumnId: null,
      })
    }
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
        n1: false,
        keyKind: 's',
        keyTableId: st.id,
        keyColumnId: k.columnId,
      })
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

  return (
    <div ref={containerRef} className="relative flex flex-col gap-6">
      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full">
        <defs>
          <marker id="er-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" />
          </marker>
        </defs>
        {lines.map((ln, i) => {
          const from = boxes[ln.sourceKey]
          const to = boxes[ln.targetKey]
          if (!from || !to) return null
          return <RelationshipLine key={i} geo={computeLine(from, to)} n1={ln.n1} />
        })}
        {dragLine && (
          <path d={dragLine} stroke="#c45004" strokeWidth={2} fill="none" strokeDasharray="4 3" />
        )}
      </svg>

      <div className="relative z-10 flex flex-col gap-6">
        {abteilungen.map((a) => {
          const schritte = alleSchritte.filter((st) => st.abteilungId === a.id)
          const neben = alleNeben.filter((n) => n.abteilungId === a.id)

          return (
            <section key={a.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-3 w-1 rounded-full bg-zollern-500" />
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
                  onClick={() => removeAbteilung(a.id)}
                  className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Abteilung löschen"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-start gap-10">
                {/* Produktionsstellen + Produktionskette als Schritt-Zeilen */}
                <div className="min-w-0 flex-1">
                  <div className="grid grid-cols-[minmax(0,1fr)_16rem] items-start gap-x-10 gap-y-5">
                    <ColumnLabel>Produktionsstellen</ColumnLabel>
                    <ColumnLabel>Produktionskette</ColumnLabel>

                    {schritte.map((st, i) => {
                      const stepMaschinen = alleMaschinen.filter((m) => m.schrittId === st.id)
                      const agg = aggregate ? aggregateSchritt(st, stepMaschinen, filter) : null
                      const matchedRows = stepMaschinen.flatMap((m) => m.rows)
                      const matched = aggregate
                        ? matchedRows.filter((r) => r.fn === filter.fn.trim() || r.datum === filter.datum).length
                        : 0
                      return (
                        <Fragment key={st.id}>
                          {/* Maschinen dieses Schritts */}
                          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-4">
                            {stepMaschinen.map((m, mi) => {
                              const anteil = agg?.entries.find((e) => e.tabelle.id === m.id)
                              const used = m.rows.some((r) => r.auftragsnummer === auftrag)
                              let opacity = 1
                              if (trace) opacity = used ? 1 : 0.15
                              else if (aggregate) opacity = opacityForPercent(anteil?.percent ?? 0)
                              return (
                                <div
                                  key={m.id}
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
                                    onRename={(name) => renameProduktionstabelle(m.id, name)}
                                    onRemove={() => removeProduktionstabelle(m.id)}
                                    percent={aggregate && agg ? (anteil?.percent ?? 0) : null}
                                    colorClass={MASCHINEN_FARBEN[mi % MASCHINEN_FARBEN.length]}
                                    onAddColumn={(name, type) => addColumnProduktion(m.id, name, type)}
                                  >
                                    {m.columns.map((c) => (
                                      <ColumnRow
                                        key={c.id}
                                        compact
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
                                      />
                                    ))}
                                  </EntityCard>
                                </div>
                              )
                            })}
                          </div>

                          {/* Schritt-Tabelle */}
                          <EntityCard
                            title={st.name}
                            onRename={(name) => renameSchritt(st.id, name)}
                            onRemove={() => removeSchritt(st.id)}
                            percent={aggregate && matchedRows.length > 0 ? (matched / matchedRows.length) * 100 : null}
                            onAddColumn={(name, type) => addColumnSchritt(st.id, name, type)}
                            footer={
                              <div className="flex items-center justify-between gap-1 border-t border-slate-100 px-2 py-1">
                                <button
                                  onClick={() => addProduktionstabelle(st.id)}
                                  className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
                                >
                                  + Maschine
                                </button>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => moveSchritt(st.id, 'up')}
                                    disabled={i === 0}
                                    className="rounded px-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                                    title="Schritt nach oben"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => moveSchritt(st.id, 'down')}
                                    disabled={i === schritte.length - 1}
                                    className="rounded px-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                                    title="Schritt nach unten"
                                  >
                                    ↓
                                  </button>
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
                                <span className="min-w-0 flex-1 text-[11px] font-medium text-slate-700">
                                  {c.name}
                                </span>
                                <span className="text-[9px] uppercase text-slate-400">{c.type}</span>
                                {c.id === 'auftragsnummer' && <KeyBadge type="pk" />}
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
                          </EntityCard>
                        </Fragment>
                      )
                    })}

                    {schritte.length === 0 && (
                      <div className="col-span-2 rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-400">
                        Keine Schritte
                      </div>
                    )}
                  </div>
                </div>

                {/* Prozessunterstützung */}
                <div className="w-60 shrink-0">
                  <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Prozessunterstützung
                    </span>
                    <button
                      onClick={() => addNebentabelle(a.id)}
                      className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
                    >
                      + Nebentabelle
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {neben.length === 0 && (
                      <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">
                        Keine Nebentabellen
                      </div>
                    )}
                    {neben.map((n) => (
                      <EntityCard
                        key={n.id}
                        title={n.name}
                        onRename={(name) => renameNebentabelle(n.id, name)}
                        onRemove={() => removeNebentabelle(n.id)}
                        onAddColumn={(name, type) => addColumnNeben(n.id, name, type)}
                      >
                        {n.columns.map((c) => (
                          <ColumnRow
                            key={c.id}
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
                          />
                        ))}
                      </EntityCard>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
