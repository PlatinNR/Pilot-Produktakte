import { useStore } from '../store'
import { DataTable } from './DataTable'

interface Props {
  abteilungId: string
}

export function NebentabellenColumn({ abteilungId }: Props) {
  const alleNebentabellen = useStore((s) => s.nebentabellen)
  const nebentabellen = alleNebentabellen.filter((n) => n.abteilungId === abteilungId)
  const {
    addNebentabelle,
    renameNebentabelle,
    removeNebentabelle,
    addColumnNeben,
    renameColumnNeben,
    changeColumnTypeNeben,
    removeColumnNeben,
    addRowNeben,
    updateCellNeben,
    removeRowNeben,
  } = useStore()

  return (
    <aside className="flex w-full shrink-0 flex-col gap-2 lg:w-80">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nebentabellen</h2>
        <button
          onClick={() => addNebentabelle(abteilungId)}
          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
        >
          + Nebentabelle
        </button>
      </div>
      <p className="text-[11px] text-slate-400">Zeitbezogene Daten der Abteilung (z. B. Wachsqualität).</p>

      {nebentabellen.length === 0 && (
        <button
          onClick={() => addNebentabelle(abteilungId)}
          className="flex min-h-[5rem] items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-400 hover:border-zollern-400 hover:bg-zollern-50 hover:text-zollern-700"
        >
          + Nebentabelle
        </button>
      )}

      <div className="flex flex-col gap-2">
        {nebentabellen.map((t) => (
          <DataTable
            key={t.id}
            title={t.name}
            onRename={(name) => renameNebentabelle(t.id, name)}
            onRemove={() => removeNebentabelle(t.id)}
            columns={t.columns}
            rows={t.rows}
            onAddColumn={(name, type) => addColumnNeben(t.id, name, type)}
            onRenameColumn={(cid, name) => renameColumnNeben(t.id, cid, name)}
            onChangeColumnType={(cid, type) => changeColumnTypeNeben(t.id, cid, type)}
            onRemoveColumn={(cid) => removeColumnNeben(t.id, cid)}
            onAddRow={() => addRowNeben(t.id)}
            onUpdateCell={(ri, cid, v) => updateCellNeben(t.id, ri, cid, v)}
            onRemoveRow={(ri) => removeRowNeben(t.id, ri)}
          />
        ))}
      </div>
    </aside>
  )
}
