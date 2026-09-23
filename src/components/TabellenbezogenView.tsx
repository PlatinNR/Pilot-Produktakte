import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import type {
  ColumnType,
  Filter,
  KeyType,
  TableColumn,
} from '../types'
import { COLUMN_TYPE_LABELS, SCHRITT_TABELLE_SPALTEN } from '../types'
import { useStore, arbeitsplatzFehlerText } from '../store'
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
  /** 'extern' = Schritt wurde extern bearbeitet (lila Markierung) */
  rahmen?: 'normal' | 'extern'
  /** Betonte Darstellung (der Schritt ist leitend) */
  betont?: boolean
  /** Tabelle kopieren */
  onKopieren?: () => void
  /** Zusätzliches Element im Kopf (z. B. AP-Nummer) */
  kopfExtra?: React.ReactNode
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
  const rahmenKlasse =
    rahmen === 'extern'
      ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-300'
      : betont
        ? 'border-zollern-300 bg-white shadow-md'
        : 'border-slate-200 bg-white'
  const titelKlasse = betont
    ? 'text-sm font-bold text-zollern-800'
    : compact
      ? 'text-[11px] font-semibold text-slate-700'
      : 'text-xs font-semibold text-slate-700'
  return (
    <div className={`overflow-hidden rounded-lg border shadow-sm ${rahmenKlasse}`}>
      <div className={`flex items-center gap-1.5 border-b border-slate-100 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1.5'}`}>
        <span className={`shrink-0 rounded-full bg-zollern-500 ${betont ? 'h-2.5 w-2.5' : 'h-2 w-2'}`} />
        <EditableName
          value={title}
          onCommit={onRename}
          className={`min-w-0 flex-1 bg-transparent outline-none ${titelKlasse}`}
        />
        {kopfExtra}
        {typeof percent === 'number' && percent >= 0 && (
          <span className="shrink-0 rounded-full bg-zollern-50 px-1.5 py-0.5 text-[10px] font-bold text-zollern-700">
            {formatPercent(percent)}
          </span>
        )}
        {onKopieren && (
          <button
            onClick={onKopieren}
            className="shrink-0 rounded px-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Tabelle kopieren (Spalten + Zeilen)"
          >
            ⧉
          </button>
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
    const channel = Math.min(from.x, to.x) - 16
    x1 = from.x
    y1 = from.y + from.h / 2
    x2 = to.x
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

const BUS_ABSTAND = 18
const BUS_LANE = 6
const TAP_MIN = 14

/**
 * Kabelkanal/Bus: mehrere Quellen auf dasselbe Ziel werden auf einer gemeinsamen senkrechten
 * Linie (Bus) gebündelt. Jede Quelle mündet auf ihrer eigenen Höhe (nicht überlappend) ein;
 * zu nahe Abzweige werden entzerrt. Kreuzen anderer Linien ist erlaubt, Überlappen nicht.
 */
function computeBus(
  mitglieder: { from: Rect; to: Rect }[],
  gruppe: number,
): { pfade: string[]; bus: string | null; taps: { x: number; y: number }[] } {
  if (mitglieder.length === 0) return { pfade: [], bus: null, taps: [] }
  if (mitglieder.length === 1) {
    // Einzelne Verbindung: direkt ohne Knick
    const m = mitglieder[0]
    const ltr = m.from.x + m.from.w <= m.to.x + 1
    const x1 = ltr ? m.from.x + m.from.w : m.from.x
    const y1 = m.from.y + m.from.h / 2
    const x2 = ltr ? m.to.x : m.to.x + m.to.w
    const y2 = m.to.y + m.to.h / 2
    return { pfade: [`M ${x1} ${y1} L ${x2} ${y2}`], bus: null, taps: [] }
  }
  const to = mitglieder[0].to
  const alleLinks = mitglieder.every((m) => m.from.x + m.from.w <= to.x + 1)
  const alleRechts = mitglieder.every((m) => m.from.x >= to.x + to.w - 1)
  if (!alleLinks && !alleRechts) {
    return { pfade: mitglieder.map((m) => computeLine(m.from, m.to).path), bus: null, taps: [] }
  }
  const ltr = alleLinks
  const quellenRand = ltr
    ? Math.max(...mitglieder.map((m) => m.from.x + m.from.w))
    : Math.min(...mitglieder.map((m) => m.from.x))
  const zielRand = ltr ? to.x : to.x + to.w
  const zielY = to.y + to.h / 2
  // Bus immer im Zwischenraum zwischen Quell- und Zielspalte halten
  const gapBreite = ltr ? zielRand - quellenRand : quellenRand - zielRand
  const abstand = Math.min(BUS_ABSTAND + gruppe * BUS_LANE, Math.max(6, gapBreite - 6))
  const busX = ltr ? zielRand - abstand : zielRand + abstand
  const naeherX = ltr ? busX - Math.min(10, Math.max(3, abstand - 2)) : busX + Math.min(10, Math.max(3, abstand - 2))

  // Quellen nach Höhe sortieren, Abzweige mit Mindestabstand entzerren
  const sortiert = [...mitglieder].sort((a, b) => a.from.y - b.from.y)
  const taps: number[] = []
  let letzter = -Infinity
  for (const m of sortiert) {
    const y = Math.max(m.from.y + m.from.h / 2, letzter + TAP_MIN)
    taps.push(y)
    letzter = y
  }
  // um das Ziel herum zentrieren
  const mitte = (taps[0] + taps[taps.length - 1]) / 2
  const versatz = (zielY - mitte) * 0.5
  const tapsVerschoben = taps.map((y) => y + versatz)

  const pfade: string[] = []
  for (let i = 0; i < sortiert.length; i++) {
    const m = sortiert[i]
    const sx = ltr ? m.from.x + m.from.w : m.from.x
    const sy = m.from.y + m.from.h / 2
    const ty = tapsVerschoben[i]
    // kleine Versätze, damit die Verbindungsstücke nicht übereinander liegen
    const naeherXI = ltr ? naeherX - (i % 3) * 3 : naeherX + (i % 3) * 3
    pfade.push(`M ${sx} ${sy} H ${naeherXI} V ${ty} H ${busX}`)
  }
  const oben = Math.min(...tapsVerschoben, zielY)
  const unten = Math.max(...tapsVerschoben, zielY)
  const bus = `M ${busX} ${oben} V ${unten} M ${busX} ${zielY} H ${zielRand}`
  return { pfade, bus, taps: tapsVerschoben.map((y) => ({ x: busX, y })) }
}

function RelationshipLine({
  geo,
  n1,
  variante = 'normal',
}: {
  geo: Geo
  n1: boolean
  variante?: 'normal' | 'prozess'
}) {
  const prozess = variante === 'prozess'
  const halo = { paintOrder: 'stroke' as const, stroke: '#ffffff', strokeWidth: 3 }
  return (
    <g>
      <path
        d={geo.path}
        stroke={prozess ? '#F56405' : '#94a3b8'}
        strokeWidth={prozess ? 2.5 : 1.5}
        fill="none"
        markerEnd={prozess ? 'url(#er-prozess-arrow)' : undefined}
      />
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

/** Arbeitsplatz-Nummer einer Maschine – klein im Kopf („AP"), gilt für alle Einträge. */
function ArbeitsplatzZeile({
  tabelleId,
  wert,
  onChange,
}: {
  tabelleId: string
  wert?: string
  onChange: (id: string, wert: string) => void
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

  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">AP</span>
      <input
        value={draft}
        onChange={(e) => aendern(e.target.value)}
        placeholder="Nr."
        className={`w-14 rounded border px-1 py-0.5 text-[10px] outline-none focus:border-zollern-400 ${
          fehler
            ? 'border-red-400 text-red-600'
            : draft
              ? 'border-slate-200 text-slate-700'
              : 'border-red-300 text-slate-500'
        }`}
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
  const nodeRefs = useRef(new Map<string, HTMLElement>())
  const [boxes, setBoxes] = useState<Record<string, Rect>>({})
  const [origin, setOrigin] = useState({ left: 0, top: 0 })
  const [dragPos, setDragPos] = useState<{ x: number; y: number; sourceKey: string } | null>(null)
  const [infoAbt, setInfoAbt] = useState<string | null>(null)

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

  const startDrag =
    (kind: 'm' | 'n' | 's', tableId: string, columnId: string, keyType: KeyType | null) =>
    (e: React.PointerEvent) => {
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
        n1: false,
        keyKind: 's',
        keyTableId: st.id,
        keyColumnId: k.columnId,
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

  // Prozessfolge der Maschinen für den verfolgten Auftrag (Kette → Schritte → Maschinen nach Datum/Uhrzeit)
  const prozessFolge: string[] = []
  if (trace) {
    const eintragVon = (m: (typeof alleMaschinen)[number]) =>
      m.rows.find((r) => r.auftragsnummer === auftrag)
    const zeitVonSchritt = (schrittId: string): string => {
      for (const m of alleMaschinen) {
        if (m.schrittId !== schrittId) continue
        const r = eintragVon(m)
        if (r) return `${r.datum ?? ''}T${r.zeit ?? ''}`
      }
      return '9999'
    }
    for (const a of abteilungen) {
      const knoten: { id: string; istBlock: boolean; pos: number }[] = []
      for (const st of alleSchritte.filter((s) => s.abteilungId === a.id && !s.blockId)) {
        knoten.push({ id: st.id, istBlock: false, pos: st.position })
      }
      for (const b of alleBloecke.filter((x) => x.abteilungId === a.id)) {
        knoten.push({ id: b.id, istBlock: true, pos: b.position })
      }
      knoten.sort((x, y) => x.pos - y.pos)

      const schrittIds: string[] = []
      for (const k of knoten) {
        if (k.istBlock) {
          const blockSchritte = alleSchritte
            .filter((s) => s.blockId === k.id)
            .sort((x, y) => zeitVonSchritt(x.id).localeCompare(zeitVonSchritt(y.id)))
          for (const s of blockSchritte) schrittIds.push(s.id)
        } else {
          schrittIds.push(k.id)
        }
      }
      for (const sid of schrittIds) {
        const ms = alleMaschinen
          .filter((m) => m.schrittId === sid && m.rows.some((r) => r.auftragsnummer === auftrag))
          .sort((x, y) => {
            const rx = eintragVon(x)
            const ry = eintragVon(y)
            return `${rx?.datum ?? ''}T${rx?.zeit ?? ''}`.localeCompare(
              `${ry?.datum ?? ''}T${ry?.zeit ?? ''}`,
            )
          })
        for (const m of ms) prozessFolge.push(`mc:${m.id}`)
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

  return (
    <div ref={containerRef} className="relative flex flex-col gap-6">
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
          // Fremdschlüssel je Ziel bündeln (Kabelkanal/Bus)
          const gruppen = new Map<string, { from: Rect; to: Rect; n1: boolean }[]>()
          for (const ln of lines) {
            const from = boxes[ln.sourceKey]
            const to = boxes[ln.targetKey]
            if (!from || !to) continue
            const liste = gruppen.get(ln.targetKey) ?? []
            liste.push({ from, to, n1: ln.n1 })
            gruppen.set(ln.targetKey, liste)
          }
          const halo = { paintOrder: 'stroke' as const, stroke: '#ffffff', strokeWidth: 3 }
          const ergebnis: React.ReactNode[] = []
          let gruppe = 0
          for (const [key, mitglieder] of gruppen) {
            const bus = computeBus(mitglieder, gruppe)
            gruppe += 1
            const to = mitglieder[0].to
            const alleLinks = mitglieder.every((m) => m.from.x + m.from.w <= to.x + 1)
            ergebnis.push(
              <g key={key}>
                {bus.pfade.map((d, i) => (
                  <path key={`p${i}`} d={d} stroke="#94a3b8" strokeWidth={1.5} fill="none" />
                ))}
                {bus.bus && <path d={bus.bus} stroke="#94a3b8" strokeWidth={1.5} fill="none" />}
                {bus.taps.map((tp, i) => (
                  <circle key={`t${i}`} cx={tp.x} cy={tp.y} r={2.5} fill="#94a3b8" />
                ))}
                {mitglieder.map((m, i) =>
                  m.n1 ? (
                    <text
                      key={`n${i}`}
                      x={alleLinks ? m.from.x + m.from.w + 5 : m.from.x - 5}
                      y={m.from.y + m.from.h / 2 - 4}
                      textAnchor={alleLinks ? 'start' : 'end'}
                      fontSize={10}
                      fontWeight={700}
                      fill="#c45004"
                      style={halo}
                    >
                      n
                    </text>
                  ) : null,
                )}
                {mitglieder.some((m) => m.n1) && (
                  <text
                    x={alleLinks ? to.x - 5 : to.x + to.w + 5}
                    y={to.y + to.h / 2 - 4}
                    textAnchor={alleLinks ? 'end' : 'start'}
                    fontSize={10}
                    fontWeight={700}
                    fill="#c45004"
                    style={halo}
                  >
                    1
                  </text>
                )}
              </g>,
            )
          }
          return ergebnis
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
        {/* Prozesspfeile: Maschine → nächste Maschine (nach Datum/Uhrzeit), prägnant orange */}
        {prozessFolge.slice(0, -1).map((key, i) => {
          const from = boxes[key]
          const to = boxes[prozessFolge[i + 1]]
          if (!from || !to) return null
          return (
            <RelationshipLine
              key={`prozess-${i}`}
              geo={computeLine(from, to)}
              n1={false}
              variante="prozess"
            />
          )
        })}
        {dragLine && (
          <path d={dragLine} stroke="#c45004" strokeWidth={2} fill="none" strokeDasharray="4 3" />
        )}
      </svg>

      <div className="relative z-20 flex flex-col gap-6">
        {abteilungen.map((a) => {
          const schritte = alleSchritte.filter((st) => st.abteilungId === a.id)
          const neben = alleNeben.filter((n) => n.abteilungId === a.id)
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

              <div className="flex items-start gap-8">
                {/* Produktionsstellen + Produktionskette als Schritt-Zeilen */}
                <div className="min-w-0 flex-1">
                  <div className="grid grid-cols-[minmax(0,1fr)_20rem] items-start gap-x-6 gap-y-5">
                    <ColumnLabel>Produktionsstellen</ColumnLabel>
                    <ColumnLabel>Produktionskette</ColumnLabel>

                    {renderItems.map((item, i) => {
                      if (item.type === 'block') {
                        const blockSteps = schritte.filter((x) => x.blockId === item.block.id)
                        return (
                          <div
                            key={`block-${item.block.id}`}
                            ref={registerRef(`bc:${item.block.id}`)}
                            className="col-span-2 rounded-lg border border-zollern-200 bg-zollern-50/40 p-2"
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
                                className="rounded px-1 text-slate-400 hover:bg-slate-100"
                                title="Block nach oben"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveBearbeitungsblock(item.block.id, 'down')}
                                className="rounded px-1 text-slate-400 hover:bg-slate-100"
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

                            {/* Schritte als Spalten von links nach rechts */}
                            <div className="overflow-x-auto pb-1">
                              <div className="flex items-start gap-3">
                                {blockSteps.map((bst) => {
                                  const bstepMaschinen = alleMaschinen.filter((m) => m.schrittId === bst.id)
                                  const agg = aggregate ? aggregateSchritt(bst, bstepMaschinen, filter) : null
                                  const bstepUsed = bstepMaschinen.some((m) =>
                                    m.rows.some((r) => r.auftragsnummer === auftrag),
                                  )
                                  const extern = trace && !bstepUsed && !bst.optional
                                  return (
                                    <div key={bst.id} className="flex w-56 shrink-0 flex-col gap-2">
                                      <EntityCard
                                        title={bst.name}
                                        onRename={(name) => renameSchritt(bst.id, name)}
                                        onRemove={() => removeSchritt(bst.id)}
                                        onAddColumn={(name, type) => addColumnSchritt(bst.id, name, type)}
                                        rahmen={extern ? 'extern' : 'normal'}
                                        betont
                                      >
                                        {extern && (
                                          <div className="border-t border-purple-100 bg-purple-100/70 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                                            extern bearbeitet
                                          </div>
                                        )}
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
                                            <span className="text-[8px] uppercase text-slate-400">{c.type}</span>
                                            {c.id === 'auftragsnummer' && <KeyBadge type="pk" />}
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
                                      <div className="flex flex-col gap-2">
                                        {bstepMaschinen.map((m, mi) => {
                                          const anteil = agg?.entries.find((e) => e.tabelle.id === m.id)
                                          const used = m.rows.some((r) => r.auftragsnummer === auftrag)
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
                                                onRename={(name) => renameProduktionstabelle(m.id, name)}
                                                onRemove={() => removeProduktionstabelle(m.id)}
                                                percent={aggregate && agg ? (anteil?.percent ?? 0) : null}
                                                colorClass={MASCHINEN_FARBEN[mi % MASCHINEN_FARBEN.length]}
                                        onAddColumn={(name, type) => addColumnProduktion(m.id, name, type)}
                                        onKopieren={() => kopiereMaschine(m.id)}
                                        kopfExtra={
                                          <ArbeitsplatzZeile
                                            tabelleId={m.id}
                                            wert={m.arbeitsplatz}
                                            onChange={setProduktionArbeitsplatz}
                                          />
                                        }
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
                                                {trace && used && (
                                                  <div className="px-2 py-1.5">
                                                    <DurchlaufWahl
                                                      tabelle={m}
                                                      auftragsnummer={auftrag}
                                                      kompakt
                                                    />
                                                  </div>
                                                )}
                                              </EntityCard>
                                            </div>
                                          )
                                        })}
                                        <div className="flex min-h-[2.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-slate-200">
                                          <button
                                            onClick={() => addProduktionstabelle(bst.id)}
                                            className="text-[11px] text-slate-400 hover:text-zollern-600"
                                          >
                                            + Arbeitsplatz
                                          </button>
                                          <button
                                            onClick={() => einfuegenMaschine(bst.id)}
                                            className="text-[10px] text-slate-400 hover:text-zollern-600"
                                            title="Kopierte Maschinentabelle hier einfügen"
                                          >
                                            ⧉ Einfügen
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                                {blockSteps.length === 0 && (
                                  <div className="flex min-h-[5rem] w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400">
                                    + Schritt über den Button oben hinzufügen
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      }
                      const st = item.st
                      const stepMaschinen = alleMaschinen.filter((m) => m.schrittId === st.id)
                      const agg = aggregate ? aggregateSchritt(st, stepMaschinen, filter) : null
                      const matchedRows = stepMaschinen.flatMap((m) => m.rows)
                      const matched = aggregate
                        ? matchedRows.filter((r) => r.fn === filter.fn.trim() || r.datum === filter.datum).length
                        : 0
                      // Nicht optionale Schritte ohne Eintrag gelten im Trace als "extern bearbeitet"
                      const schrittUsed = stepMaschinen.some((m) =>
                        m.rows.some((r) => r.auftragsnummer === auftrag),
                      )
                      const extern = trace && !schrittUsed && !st.optional
                      return (
                        <Fragment key={st.id}>
                          {/* Maschinen dieses Schritts */}
                          <div className="grid grid-cols-2 content-start items-start gap-4 self-start lg:grid-cols-3 2xl:grid-cols-4">
                            {stepMaschinen.map((m, mi) => {
                              const anteil = agg?.entries.find((e) => e.tabelle.id === m.id)
                              const used = m.rows.some((r) => r.auftragsnummer === auftrag)
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
                                    onRename={(name) => renameProduktionstabelle(m.id, name)}
                                    onRemove={() => removeProduktionstabelle(m.id)}
                                    percent={aggregate && agg ? (anteil?.percent ?? 0) : null}
                                    colorClass={MASCHINEN_FARBEN[mi % MASCHINEN_FARBEN.length]}
                                    onAddColumn={(name, type) => addColumnProduktion(m.id, name, type)}
                                    onKopieren={() => kopiereMaschine(m.id)}
                                    kopfExtra={
                                      <ArbeitsplatzZeile
                                        tabelleId={m.id}
                                        wert={m.arbeitsplatz}
                                        onChange={setProduktionArbeitsplatz}
                                      />
                                    }
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
                                    {trace && used && (
                                      <div className="px-2 py-1.5">
                                        <DurchlaufWahl tabelle={m} auftragsnummer={auftrag} kompakt />
                                      </div>
                                    )}
                                  </EntityCard>
                                </div>
                              )
                            })}
                          </div>

                          {/* Schritt-Tabelle */}
                          <div ref={registerRef(`sc:${st.id}`)}>
                            <EntityCard
                              title={st.name}
                              onRename={(name) => renameSchritt(st.id, name)}
                              onRemove={() => removeSchritt(st.id)}
                              percent={aggregate && matchedRows.length > 0 ? (matched / matchedRows.length) * 100 : null}
                              onAddColumn={(name, type) => addColumnSchritt(st.id, name, type)}
                              rahmen={extern ? 'extern' : 'normal'}
                              betont
                            footer={
                              <div className="flex items-center justify-between gap-1 border-t border-slate-100 px-2 py-1">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => addProduktionstabelle(st.id)}
                                    className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
                                  >
                                    + Arbeitsplatz
                                  </button>
                                  <button
                                    onClick={() => einfuegenMaschine(st.id)}
                                    className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                                    title="Kopierte Maschinentabelle hier einfügen"
                                  >
                                    ⧉ Einfügen
                                  </button>
                                </div>
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
                            {extern && (
                              <div className="border-t border-purple-100 bg-purple-100/70 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                                extern bearbeitet
                              </div>
                            )}
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

                {/* Unterstützungsprozesse */}
                <div className="w-80 shrink-0 xl:w-96">
                  <div className="mb-2 border-b border-slate-200 pb-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Unterstützungsprozess
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <button
                        onClick={() => einfuegenNebentabelle(a.id)}
                        className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                        title="Kopierte Nebentabelle hier einfügen"
                      >
                        ⧉ Einfügen
                      </button>
                      <button
                        onClick={() => addNebentabelle(a.id)}
                        className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
                      >
                        + Unterstützungsprozess
                      </button>
                    </div>
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
                        onKopieren={() => kopiereNebentabelle(n.id)}
                        kopfExtra={
                          <ArbeitsplatzZeile
                            tabelleId={n.id}
                            wert={n.arbeitsplatz}
                            onChange={setNebenArbeitsplatz}
                          />
                        }
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
      {infoAbt && <InfoModal abteilungId={infoAbt} onClose={() => setInfoAbt(null)} />}
    </div>
  )
}
