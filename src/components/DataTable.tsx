import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ColumnType, TableColumn, TableKey, TableRow, TabellenModus, TabellenRegister } from '../types'
import { COLUMN_TYPE_LABELS } from '../types'
import { spaltenName } from '../lib/i18n'
import { useAktuelleSprache, useT } from '../lib/sprache'
import { EditableName } from './EditableName'
import { KeyBadge } from './KeyBadge'
import { keyTypeOf } from '../utils/keys'
import {
  DEFAULT_REGISTER_ID,
  filterColumnsByRegister,
  getTabellenRegister,
  countColumnsInRegister,
} from '../utils/register'

interface Props {
  title: string
  onRename: (name: string) => void
  onRemove: () => void
  columns: TableColumn[]
  rows: TableRow[]
  onAddColumn: (name: string, type: ColumnType, registerId?: string) => void
  onRenameColumn: (columnId: string, name: string) => void
  onChangeColumnType: (columnId: string, type: ColumnType) => void
  onRemoveColumn: (columnId: string) => void
  onAddRow: () => void
  onUpdateCell: (rowIndex: number, columnId: string, value: string) => void
  onRemoveRow: (rowIndex: number) => void
  percent?: number | null
  colorClass?: string
  keys?: TableKey[]
  onCycleKey?: (columnId: string) => void
  /** Feste Arbeitsplatz-Nummer der Maschine (gleiche Nummer für alle Einträge) */
  arbeitsplatz?: string
  onArbeitsplatzChange?: (wert: string) => void
  /** Prüft eine Arbeitsplatz-Nummer und liefert eine Fehlermeldung (null = ok) */
  arbeitsplatzPruefen?: (wert: string) => string | null
  /** Zusätzlicher Block unter dem Kopf (z. B. Auswahl der Arbeitswiederholung) */
  kopfExtra?: ReactNode
  /** Tabelle kopieren */
  onKopieren?: () => void
  /** Modus: Soll (weiß) oder Ist (schwarz, invertiert) */
  modus?: TabellenModus
  onModusChange?: (modus: TabellenModus) => void
  /** Register (Reiter) für Spaltengruppierung */
  register?: TabellenRegister[]
  activeRegisterId?: string | null
  onSelectRegister?: (registerId: string | null) => void
  onAddRegister?: (name?: string) => void
  onRenameRegister?: (registerId: string, name: string) => void
  onRemoveRegister?: (registerId: string) => void
  onMoveColumnToRegister?: (columnId: string, targetRegisterId: string) => void
}

function inputType(type: ColumnType): string {
  if (type === 'number') return 'number'
  if (type === 'date') return 'date'
  if (type === 'time') return 'time'
  return 'text'
}

export function DataTable({
  title,
  onRename,
  onRemove,
  columns,
  rows,
  onAddColumn,
  onRenameColumn,
  onChangeColumnType,
  onRemoveColumn,
  onAddRow,
  onUpdateCell,
  onRemoveRow,
  percent,
  colorClass,
  keys,
  onCycleKey,
  arbeitsplatz,
  onArbeitsplatzChange,
  arbeitsplatzPruefen,
  kopfExtra,
  onKopieren,
  modus,
  onModusChange,
  register,
  activeRegisterId,
  onSelectRegister,
  onAddRegister,
  onRenameRegister,
  onRemoveRegister,
  onMoveColumnToRegister,
}: Props) {
  const isIst = modus === 'ist'
  const t = useT()
  const sprache = useAktuelleSprache()
  const [addingCol, setAddingCol] = useState(false)
  const [colName, setColName] = useState('')
  const [colType, setColType] = useState<ColumnType>('text')
  const [arbeitsplatzDraft, setArbeitsplatzDraft] = useState(arbeitsplatz ?? '')
  const [arbeitsplatzFehler, setArbeitsplatzFehler] = useState<string | null>(null)
  const [letzterArbeitsplatz, setLetzterArbeitsplatz] = useState(arbeitsplatz)
  const [editingRegisterId, setEditingRegisterId] = useState<string | null>(null)
  const [editingRegisterName, setEditingRegisterName] = useState('')
  const [dragOverRegisterId, setDragOverRegisterId] = useState<string | null>(null)

  const registerListe = getTabellenRegister({ register })
  const currentActive =
    activeRegisterId !== undefined ? activeRegisterId : registerListe[0]?.id
  const isCollapsed = currentActive === null
  const visibleColumns = filterColumnsByRegister(columns, currentActive)

  // Prop-Änderung von außen übernehmen (ohne Effekt)
  if (arbeitsplatz !== letzterArbeitsplatz) {
    setLetzterArbeitsplatz(arbeitsplatz)
    setArbeitsplatzDraft(arbeitsplatz ?? '')
  }

  const aendereArbeitsplatz = (wert: string) => {
    setArbeitsplatzDraft(wert)
    const fehler = arbeitsplatzPruefen?.(wert) ?? null
    setArbeitsplatzFehler(fehler)
    if (!fehler) onArbeitsplatzChange?.(wert)
  }

  const submitColumn = () => {
    const trimmed = colName.trim()
    if (!trimmed) return
    const targetReg = currentActive || DEFAULT_REGISTER_ID
    onAddColumn(trimmed, colType, targetReg)
    setColName('')
    setColType('text')
    setAddingCol(false)
  }

  const showPercent = typeof percent === 'number' && percent >= 0

  return (
    <div
      className={`overflow-hidden rounded-lg border shadow-sm transition-colors ${
        isIst
          ? 'border-zinc-800 bg-zinc-950 text-white ring-1 ring-zinc-800'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Kopfzeile der Tabelle */}
      <div
        className={`flex items-center gap-2 border-b px-3 py-2 ${
          isIst ? 'border-zinc-800 bg-zinc-900/60' : 'border-slate-100'
        }`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            isIst ? 'bg-zollern-500 ring-2 ring-zollern-500/20' : 'bg-zollern-600'
          }`}
        />
        <EditableName
          value={title}
          onCommit={onRename}
          dark={isIst}
          className={`min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none ${
            isIst ? 'text-white' : 'text-slate-800'
          }`}
        />
        {showPercent && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
              isIst
                ? 'border border-zinc-700 bg-zinc-800 text-zollern-400'
                : 'bg-zollern-50 text-zollern-700'
            }`}
          >
            {Math.round(percent * 10) / 10} %
          </span>
        )}
        {onKopieren && (
          <button
            onClick={onKopieren}
            className={`shrink-0 rounded px-1 text-xs ${
              isIst
                ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title={t('Tabelle kopieren (Spalten + Zeilen)')}
          >
            ⧉
          </button>
        )}
        <button
          onClick={onRemove}
          className={`shrink-0 rounded px-1.5 text-xs ${
            isIst
              ? 'text-zinc-400 hover:bg-red-950/60 hover:text-red-400'
              : 'text-slate-400 hover:bg-red-50 hover:text-red-600'
          }`}
          title={t('Tabelle löschen')}
        >
          ✕
        </button>
      </div>

      {showPercent && (
        <div className={`h-1 w-full ${isIst ? 'bg-zinc-850' : 'bg-slate-100'}`}>
          <div
            className={`h-full ${colorClass ?? 'bg-zollern-600'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {onArbeitsplatzChange && (
        <div
          className={`border-b ${
            isIst ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-100 bg-slate-50/60'
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-1">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide ${
                isIst ? 'text-zinc-400' : 'text-slate-400'
              }`}
            >
              {t('Arbeitsplatz')}
            </span>
            <input
              value={arbeitsplatzDraft}
              onChange={(e) => aendereArbeitsplatz(e.target.value)}
              placeholder={t('Nr. zuweisen')}
              className={`w-28 rounded border px-1.5 py-0.5 text-xs outline-none focus:border-zollern-400 ${
                arbeitsplatzFehler
                  ? 'border-red-400 text-red-500'
                  : isIst
                    ? 'border-zinc-700 bg-zinc-900 text-white placeholder-zinc-500'
                    : arbeitsplatzDraft
                      ? 'border-slate-200 bg-white text-slate-700'
                      : 'border-red-300 bg-white text-slate-500'
              }`}
              title={
                arbeitsplatzFehler ??
                (arbeitsplatzDraft
                  ? t('Arbeitsplatz-Nummer (gilt für alle Einträge)')
                  : t('Arbeitsplatz-Nummer fehlt'))
              }
            />
          </div>
          {arbeitsplatzFehler && (
            <p className="px-3 pb-1 text-[10px] text-red-600">{arbeitsplatzFehler}</p>
          )}
        </div>
      )}

      {kopfExtra && (
        <div
          className={`border-b px-2 py-1.5 ${
            isIst ? 'border-zinc-800 bg-zinc-900/30' : 'border-slate-100'
          }`}
        >
          {kopfExtra}
        </div>
      )}

      {/* --- Register-Reiter (Tabs) --- */}
      <div
        className={`flex flex-wrap items-center justify-between gap-1 border-b px-2 py-1 text-xs select-none ${
          isIst
            ? 'border-zinc-800 bg-zinc-900/80 text-zinc-300'
            : 'border-slate-100 bg-slate-50/80 text-slate-600'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1 min-w-0">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider mr-0.5 ${
              isIst ? 'text-zinc-400' : 'text-slate-400'
            }`}
          >
            Reiter:
          </span>

          {registerListe.map((reg) => {
            const isActive = !isCollapsed && currentActive === reg.id
            const colCount = countColumnsInRegister(columns, reg.id)
            const isDragTarget = dragOverRegisterId === reg.id

            return (
              <div
                key={reg.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dragOverRegisterId !== reg.id) setDragOverRegisterId(reg.id)
                }}
                onDragLeave={() => {
                  if (dragOverRegisterId === reg.id) setDragOverRegisterId(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOverRegisterId(null)
                  const colId = e.dataTransfer.getData('text/plain')
                  if (colId && onMoveColumnToRegister) {
                    onMoveColumnToRegister(colId, reg.id)
                  }
                }}
                className={`group flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-all ${
                  isDragTarget
                    ? 'ring-2 ring-zollern-500 bg-zollern-50 text-zollern-800 scale-105'
                    : isActive
                      ? isIst
                        ? 'bg-zinc-800 text-white shadow-xs ring-1 ring-zinc-700 font-semibold'
                        : 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/90 font-semibold'
                      : isIst
                        ? 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                        : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800'
                }`}
              >
                {editingRegisterId === reg.id ? (
                  <input
                    value={editingRegisterName}
                    onChange={(e) => setEditingRegisterName(e.target.value)}
                    onBlur={() => {
                      if (editingRegisterName.trim()) {
                        onRenameRegister?.(reg.id, editingRegisterName.trim())
                      }
                      setEditingRegisterId(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingRegisterName.trim()) {
                          onRenameRegister?.(reg.id, editingRegisterName.trim())
                        }
                        setEditingRegisterId(null)
                      }
                      if (e.key === 'Escape') setEditingRegisterId(null)
                    }}
                    autoFocus
                    className={`w-24 rounded border px-1 py-0 text-xs outline-none ${
                      isIst
                        ? 'border-zinc-700 bg-zinc-900 text-white'
                        : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectRegister?.(isActive ? null : reg.id)}
                    className="flex items-center gap-1 cursor-pointer"
                    title={
                      isActive
                        ? t('Klicken zum Einklappen')
                        : t('Reiter öffnen (Spalten hierhin ziehbar)')
                    }
                  >
                    <span>{reg.name}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded-full font-medium ${
                        isActive
                          ? isIst
                            ? 'bg-zinc-700 text-zinc-200'
                            : 'bg-slate-100 text-slate-600'
                          : isIst
                            ? 'bg-zinc-850 text-zinc-400'
                            : 'bg-slate-200 text-slate-500'
                      }`}
                      title={`${colCount} Spalten`}
                    >
                      {colCount}
                    </span>
                  </button>
                )}

                {onRenameRegister && editingRegisterId !== reg.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRegisterId(reg.id)
                      setEditingRegisterName(reg.name)
                    }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity text-[10px] ${
                      isIst
                        ? 'text-zinc-400 hover:text-zinc-200'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title={t('Reiter umbenennen')}
                  >
                    ✎
                  </button>
                )}

                {registerListe.length > 1 && onRemoveRegister && editingRegisterId !== reg.id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Reiter "${reg.name}" löschen? Enthaltene Spalten werden in "${registerListe[0].name}" verschoben.`,
                        )
                      ) {
                        onRemoveRegister(reg.id)
                      }
                    }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity text-[10px] ${
                      isIst ? 'text-zinc-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'
                    }`}
                    title={t('Reiter löschen (Spalten bleiben erhalten)')}
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
                const neu = window.prompt(
                  'Name des neuen Reiters (z. B. Prozessparameter, Sollwerte, Messungen):',
                  '',
                )
                if (neu !== null) {
                  onAddRegister(neu.trim() || undefined)
                }
              }}
              className={`flex items-center gap-0.5 rounded border border-dashed px-1.5 py-0.5 text-[11px] transition-colors ${
                isIst
                  ? 'border-zinc-750 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-850 hover:text-zinc-200'
                  : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-800'
              }`}
              title={t('Neuen Reiter anlegen')}
            >
              <span className="font-bold">+</span> Reiter
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelectRegister?.(isCollapsed ? registerListe[0].id : null)}
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
            isIst
              ? 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
              : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800'
          }`}
          title={
            isCollapsed
              ? t('Ausklappen: Details anzeigen')
              : t('Einklappen: nur Pflichtdaten anzeigen')
          }
        >
          {isCollapsed ? '▸ Ausklappen' : '▾ Einklappen'}
        </button>
      </div>

      {/* --- Tabelleninhalt --- */}
      <div className="max-h-[11rem] overflow-x-auto overflow-y-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className={isIst ? 'bg-zinc-900 border-b border-zinc-800' : 'bg-slate-50'}>
              {visibleColumns.map((c) => (
                <th
                  key={c.id}
                  draggable={!c.fixed}
                  onDragStart={(e) => {
                    if (!c.fixed) {
                      e.dataTransfer.setData('text/plain', c.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }
                  }}
                  className={`whitespace-nowrap px-2 py-1.5 text-left font-medium ${
                    !c.fixed ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${
                    isIst
                      ? 'border-b border-zinc-800 text-zinc-200'
                      : 'border-b border-slate-100 text-slate-600'
                  }`}
                  title={!c.fixed ? t('Auf einen Reiter ziehen, um die Spalte zu verschieben') : undefined}
                >
                  {c.fixed ? (
                    <span className="inline-flex items-center gap-1">
                      {spaltenName(c, sprache)}
                      <span
                        className={`text-[9px] font-normal uppercase ${
                          isIst
                            ? 'text-zinc-400 bg-zinc-800 px-1 py-0.2 rounded'
                            : 'text-slate-400'
                        }`}
                      >
                        {t('fix')}
                      </span>
                      <KeyBadge
                        type={keyTypeOf(keys, c.id)}
                        dark={isIst}
                        onClick={onCycleKey ? () => onCycleKey(c.id) : undefined}
                      />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <input
                        value={c.name}
                        onChange={(e) => onRenameColumn(c.id, e.target.value)}
                        className={`w-24 rounded border border-transparent bg-transparent px-1 py-0.5 font-medium outline-none ${
                          isIst
                            ? 'text-white hover:border-zinc-700 focus:border-zollern-400'
                            : 'text-slate-700 hover:border-slate-200 focus:border-zollern-400'
                        }`}
                      />
                      <select
                        value={c.type}
                        onChange={(e) => onChangeColumnType(c.id, e.target.value as ColumnType)}
                        className={`rounded border px-1 py-0.5 text-[10px] ${
                          isIst
                            ? 'border-zinc-750 bg-zinc-850 text-zinc-200'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                        title={t('Spaltentyp')}
                      >
                        {(Object.keys(COLUMN_TYPE_LABELS) as ColumnType[]).map((typ) => (
                          <option key={typ} value={typ}>
                            {t(COLUMN_TYPE_LABELS[typ])}
                          </option>
                        ))}
                      </select>

                      {registerListe.length > 1 && onMoveColumnToRegister && (
                        <select
                          value={c.registerId || DEFAULT_REGISTER_ID}
                          onChange={(e) => onMoveColumnToRegister(c.id, e.target.value)}
                          className={`rounded border px-1 py-0.5 text-[9px] ${
                            isIst
                              ? 'border-zinc-750 bg-zinc-850 text-zinc-300'
                              : 'border-slate-200 bg-white text-slate-500'
                          }`}
                          title={t('In Reiter verschieben')}
                        >
                          {registerListe.map((r) => (
                            <option key={r.id} value={r.id}>
                              📁 {r.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <KeyBadge
                        type={keyTypeOf(keys, c.id)}
                        dark={isIst}
                        onClick={onCycleKey ? () => onCycleKey(c.id) : undefined}
                      />
                      <button
                        onClick={() => onRemoveColumn(c.id)}
                        className={
                          isIst
                            ? 'text-zinc-500 hover:text-red-400'
                            : 'text-slate-300 hover:text-red-500'
                        }
                        title={t('Spalte löschen')}
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </th>
              ))}
              <th className={`w-6 border-b ${isIst ? 'border-zinc-800' : 'border-slate-100'}`} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={`last:border-0 ${
                  isIst
                    ? 'border-b border-zinc-850/80 hover:bg-zinc-900/40'
                    : 'border-b border-slate-50'
                }`}
              >
                {visibleColumns.map((c) => (
                  <td key={c.id} className="px-2 py-1">
                    <input
                      type={inputType(c.type)}
                      value={row[c.id] ?? ''}
                      onChange={(e) => onUpdateCell(ri, c.id, e.target.value)}
                      className={`w-full min-w-[5rem] rounded border px-1 py-0.5 text-xs outline-none focus:border-zollern-400 ${
                        c.id === 'zeit' && !row[c.id]
                          ? isIst
                            ? 'border-red-600 bg-red-950/40 text-red-200'
                            : 'border-red-300 bg-red-50/60'
                          : isIst
                            ? 'border-transparent bg-transparent text-white hover:border-zinc-800 focus:bg-zinc-900'
                            : 'border-transparent bg-transparent text-slate-700 hover:border-slate-200 focus:bg-white'
                      }`}
                      title={
                        c.id === 'zeit' && !row[c.id]
                          ? 'Uhrzeit fehlt – jede angesetzte Maschine braucht eine Uhrzeit'
                          : undefined
                      }
                    />
                  </td>
                ))}
                <td className="px-1 py-1">
                  <button
                    onClick={() => onRemoveRow(ri)}
                    className={
                      isIst
                        ? 'text-zinc-500 hover:text-red-400'
                        : 'text-slate-300 hover:text-red-500'
                    }
                    title={t('Zeile löschen')}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className={`px-3 py-2 text-center text-[11px] ${
                    isIst ? 'text-zinc-500' : 'text-slate-400'
                  }`}
                >
                  {t('Noch keine Durchläufe')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isCollapsed && (
        <div
          className={`border-t px-3 py-1 text-center text-[11px] italic ${
            isIst ? 'border-zinc-850 text-zinc-400 bg-zinc-900/30' : 'border-slate-100 text-slate-400 bg-slate-50/30'
          }`}
        >
          {t('Reiter eingeklappt – nur Pflichtdaten sichtbar. Klicke auf einen Reiter zum Öffnen.')}
        </div>
      )}

      {/* Fußzeile mit Aktionen */}
      <div
        className={`flex items-center justify-between gap-2 border-t px-2 py-1.5 ${
          isIst ? 'border-zinc-800 bg-zinc-900/40' : 'border-slate-100'
        }`}
      >
        <button
          onClick={onAddRow}
          className={`rounded px-2 py-1 text-xs font-medium ${
            isIst
              ? 'text-zollern-400 hover:bg-zinc-850'
              : 'text-zollern-700 hover:bg-zollern-50'
          }`}
        >
          {t('+ Zeile')}
        </button>

        <div className="flex items-center gap-1.5">
          {addingCol ? (
            <div className="flex items-center gap-1">
              <input
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                placeholder="Feldname"
                className={`w-28 rounded border px-2 py-0.5 text-xs ${
                  isIst
                    ? 'border-zinc-750 bg-zinc-850 text-white placeholder-zinc-500'
                    : 'border-slate-200 px-2 py-0.5 text-slate-800'
                }`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitColumn()
                  if (e.key === 'Escape') setAddingCol(false)
                }}
              />
              <select
                value={colType}
                onChange={(e) => setColType(e.target.value as ColumnType)}
                className={`rounded border px-1 py-0.5 text-xs ${
                  isIst ? 'border-zinc-750 bg-zinc-850 text-zinc-200' : 'border-slate-200'
                }`}
              >
                <option value="text">Text</option>
                <option value="number">Zahl</option>
                <option value="date">Datum</option>
              </select>
              <button
                onClick={submitColumn}
                className="rounded bg-zollern-700 px-2 py-0.5 text-xs text-white hover:bg-zollern-800"
              >
                ✓
              </button>
              <button
                onClick={() => setAddingCol(false)}
                className={`rounded px-1 text-xs ${
                  isIst ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCol(true)}
              className={`rounded px-2 py-1 text-xs ${
                isIst
                  ? 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
              title={
                currentActive
                  ? `Neues Feld im Reiter "${registerListe.find((r) => r.id === currentActive)?.name || 'Allgemein'}" anlegen`
                  : '+ Spalte'
              }
            >
              {t('+ Spalte')}
            </button>
          )}

          {onModusChange && (
            <div
              className={`flex items-center rounded-md border p-0.5 text-[10px] font-semibold transition-colors ${
                isIst ? 'border-zinc-750 bg-zinc-900' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={() => onModusChange('soll')}
                className={`rounded px-1.5 py-0.5 transition-all ${
                  !isIst
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={t('Soll-Tabelle (weiß, Vorgabe)')}
              >
                {t('Soll')}
              </button>
              <button
                type="button"
                onClick={() => onModusChange('ist')}
                className={`rounded px-1.5 py-0.5 transition-all ${
                  isIst
                    ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700 font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title={t('Ist-Tabelle (schwarz, reale Fertigungsdaten)')}
              >
                {t('Ist')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
