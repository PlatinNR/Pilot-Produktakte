import type { ColumnType, InfoFeld } from '../types'
import { COLUMN_TYPE_LABELS, INFO_STANDARD_FELDER } from '../types'

interface Props {
  felder: InfoFeld[]
  bearbeiten: boolean
  onAdd: () => void
  onRename: (feldId: string, name: string) => void
  onChangeType: (feldId: string, type: ColumnType) => void
  onRemove: (feldId: string) => void
}

const feldInput =
  'w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700 outline-none focus:border-zollern-400'

/** Feld-Definitionen einer Info (feste Felder + eigene). Werte folgen später je Fertigungsauftrag. */
export function InfoFelderListe({ felder, bearbeiten, onAdd, onRename, onChangeType, onRemove }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Felder</h3>
        {bearbeiten && (
          <button
            onClick={onAdd}
            className="rounded border border-zollern-700 px-2 py-0.5 text-xs font-medium text-zollern-700 hover:bg-zollern-50"
          >
            + Feld
          </button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
            <th className="px-2 py-1 font-semibold">Info</th>
            <th className="w-20 px-2 py-1 font-semibold">Typ</th>
            {bearbeiten && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {INFO_STANDARD_FELDER.map((f) => (
            <tr key={f.id} className="border-t border-slate-100">
              <td className="px-2 py-1 text-slate-600">{f.name}</td>
              <td className="px-2 py-1 text-xs text-slate-400">{COLUMN_TYPE_LABELS[f.type]}</td>
              {bearbeiten && (
                <td className="px-1 text-center text-[10px] text-slate-300" title="Immer enthalten">
                  fest
                </td>
              )}
            </tr>
          ))}
          {felder.map((f) => (
            <tr key={f.id} className="border-t border-slate-100">
              {bearbeiten ? (
                <>
                  <td className="px-1 py-0.5">
                    <input value={f.name} onChange={(e) => onRename(f.id, e.target.value)} className={feldInput} placeholder="Name" />
                  </td>
                  <td className="px-1 py-0.5">
                    <select
                      value={f.type}
                      onChange={(e) => onChangeType(f.id, e.target.value as ColumnType)}
                      className="w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-700"
                    >
                      <option value="text">Text</option>
                      <option value="number">Zahl</option>
                      <option value="date">Datum</option>
                    </select>
                  </td>
                  <td className="px-1 text-center">
                    <button
                      onClick={() => onRemove(f.id)}
                      className="rounded px-1 text-slate-400 hover:text-red-500"
                      title="Feld löschen"
                    >
                      ✕
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-2 py-1 text-slate-600">{f.name}</td>
                  <td className="px-2 py-1 text-xs text-slate-400">{COLUMN_TYPE_LABELS[f.type]}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {felder.length === 0 && (
        <p className="text-xs text-slate-400">
          {bearbeiten
            ? 'Noch keine eigenen Felder – mit „+ Feld" ergänzen (z. B. Gewicht, Anzahl Trauben).'
            : 'Nur die drei festen Felder – über „Bearbeiten" ergänzen.'}
        </p>
      )}
    </div>
  )
}
