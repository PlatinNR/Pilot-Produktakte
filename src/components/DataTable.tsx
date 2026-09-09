import { useState } from 'react'
import type { ColumnType, TableColumn, TableKey, TableRow } from '../types'
import { COLUMN_TYPE_LABELS } from '../types'
import { EditableName } from './EditableName'
import { KeyBadge } from './KeyBadge'
import { keyTypeOf } from '../utils/keys'

interface Props {
  title: string
  onRename: (name: string) => void
  onRemove: () => void
  columns: TableColumn[]
  rows: TableRow[]
  onAddColumn: (name: string, type: ColumnType) => void
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
}

function inputType(type: ColumnType): string {
  if (type === 'number') return 'number'
  if (type === 'date') return 'date'
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
}: Props) {
  const [addingCol, setAddingCol] = useState(false)
  const [colName, setColName] = useState('')
  const [colType, setColType] = useState<ColumnType>('text')

  const submitColumn = () => {
    const trimmed = colName.trim()
    if (!trimmed) return
    onAddColumn(trimmed, colType)
    setColName('')
    setColType('text')
    setAddingCol(false)
  }

  const showPercent = typeof percent === 'number' && percent >= 0

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-zollern-600" />
        <EditableName
          value={title}
          onCommit={onRename}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none"
        />
        {showPercent && (
          <span className="shrink-0 rounded-full bg-zollern-50 px-2 py-0.5 text-xs font-bold text-zollern-700">
            {Math.round(percent * 10) / 10} %
          </span>
        )}
        <button
          onClick={onRemove}
          className="shrink-0 rounded px-1.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
          title="Tabelle löschen"
        >
          ✕
        </button>
      </div>

      {showPercent && (
        <div className="h-1 w-full bg-slate-100">
          <div className={`h-full ${colorClass ?? 'bg-zollern-600'}`} style={{ width: `${percent}%` }} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((c) => (
                <th key={c.id} className="whitespace-nowrap border-b border-slate-100 px-2 py-1.5 text-left font-medium text-slate-600">
                  {c.fixed ? (
                    <span className="inline-flex items-center gap-1">
                      {c.name}
                      <span className="text-[9px] font-normal uppercase text-slate-400">fix</span>
                      <KeyBadge
                        type={keyTypeOf(keys, c.id)}
                        onClick={onCycleKey ? () => onCycleKey(c.id) : undefined}
                      />
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <input
                        value={c.name}
                        onChange={(e) => onRenameColumn(c.id, e.target.value)}
                        className="w-24 rounded border border-transparent bg-transparent px-1 py-0.5 font-medium text-slate-700 outline-none hover:border-slate-200 focus:border-zollern-400"
                      />
                      <select
                        value={c.type}
                        onChange={(e) => onChangeColumnType(c.id, e.target.value as ColumnType)}
                        className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] text-slate-500"
                        title="Spaltentyp"
                      >
                        {(Object.keys(COLUMN_TYPE_LABELS) as ColumnType[]).map((t) => (
                          <option key={t} value={t}>
                            {COLUMN_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                      <KeyBadge
                        type={keyTypeOf(keys, c.id)}
                        onClick={onCycleKey ? () => onCycleKey(c.id) : undefined}
                      />
                      <button
                        onClick={() => onRemoveColumn(c.id)}
                        className="text-slate-300 hover:text-red-500"
                        title="Spalte löschen"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </th>
              ))}
              <th className="w-6 border-b border-slate-100" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-50 last:border-0">
                {columns.map((c) => (
                  <td key={c.id} className="px-2 py-1">
                    <input
                      type={inputType(c.type)}
                      value={row[c.id] ?? ''}
                      onChange={(e) => onUpdateCell(ri, c.id, e.target.value)}
                      className="w-full min-w-[5rem] rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-700 outline-none hover:border-slate-200 focus:border-zollern-400 focus:bg-white"
                    />
                  </td>
                ))}
                <td className="px-1 py-1">
                  <button
                    onClick={() => onRemoveRow(ri)}
                    className="text-slate-300 hover:text-red-500"
                    title="Zeile löschen"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-2 text-center text-[11px] text-slate-400">
                  Noch keine Durchläufe
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-2 py-1.5">
        <button
          onClick={onAddRow}
          className="rounded px-2 py-1 text-xs font-medium text-zollern-700 hover:bg-zollern-50"
        >
          + Zeile
        </button>

        {addingCol ? (
          <div className="flex items-center gap-1">
            <input
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              className="w-28 rounded border border-slate-200 px-2 py-0.5 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitColumn()
                if (e.key === 'Escape') setAddingCol(false)
              }}
            />
            <select
              value={colType}
              onChange={(e) => setColType(e.target.value as ColumnType)}
              className="rounded border border-slate-200 px-1 py-0.5 text-xs"
            >
              <option value="text">Text</option>
              <option value="number">Zahl</option>
              <option value="date">Datum</option>
            </select>
            <button onClick={submitColumn} className="rounded bg-zollern-700 px-2 py-0.5 text-xs text-white hover:bg-zollern-800">
              ✓
            </button>
            <button onClick={() => setAddingCol(false)} className="rounded px-1 text-xs text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingCol(true)}
            className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            + Spalte
          </button>
        )}
      </div>
    </div>
  )
}
