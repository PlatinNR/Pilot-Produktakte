import type { Filter, Schritt } from '../types'
import { useStore, arbeitsplatzFehlerText } from '../store'
import { aggregateSchritt, formatPercent, isAggregateMode, isTraceMode, MASCHINEN_FARBEN } from '../utils/aggregate'
import { EditableName } from './EditableName'
import { DataTable } from './DataTable'
import { DurchlaufWahl } from './DurchlaufWahl'
import { einfuegenMaschine, kopiereMaschine } from '../lib/tabellenKopie'

interface Props {
  schritt: Schritt
  filter: Filter
}

export function SchrittRow({ schritt, filter }: Props) {
  const alleMaschinen = useStore((s) => s.produktionstabellen)
  const maschinen = alleMaschinen.filter((t) => t.schrittId === schritt.id)
  const alleBloecke = useStore((s) => s.bearbeitungsbloecke)
  const bloecke = alleBloecke.filter((b) => b.abteilungId === schritt.abteilungId)
  const {
    renameSchritt,
    removeSchritt,
    moveSchritt,
    setSchrittBlock,
    addProduktionstabelle,
    renameProduktionstabelle,
    removeProduktionstabelle,
    setProduktionArbeitsplatz,
    addColumnProduktion,
    renameColumnProduktion,
    changeColumnTypeProduktion,
    removeColumnProduktion,
    addRowProduktion,
    updateCellProduktion,
    removeRowProduktion,
  } = useStore()

  const aggregate = isAggregateMode(filter) ? aggregateSchritt(schritt, maschinen, filter) : null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zollern-700 text-sm font-bold text-white">
          {schritt.position}
        </span>
        <EditableName
          value={schritt.name}
          onCommit={(name) => renameSchritt(schritt.id, name)}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none"
        />

        <select
          value={schritt.blockId ?? ''}
          onChange={(e) => setSchrittBlock(schritt.id, e.target.value || null)}
          className="shrink-0 rounded border border-slate-300 px-1 py-0.5 text-[11px] text-slate-600"
          title="Zugehörigkeit: fester Schritt oder Variabler Block"
        >
          <option value="">fester Schritt</option>
          {bloecke.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {aggregate && aggregate.total > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex h-3 w-40 overflow-hidden rounded-full bg-slate-100">
              {aggregate.entries
                .filter((e) => e.count > 0)
                .map((e, i) => (
                  <div
                    key={e.tabelle.id}
                    className={`h-full ${MASCHINEN_FARBEN[i % MASCHINEN_FARBEN.length]}`}
                    style={{ width: `${e.percent}%` }}
                    title={`${e.tabelle.name}: ${formatPercent(e.percent)}`}
                  />
                ))}
            </div>
            <span className="text-xs text-slate-500">{aggregate.total} Durchläufe</span>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => moveSchritt(schritt.id, 'up')}
            className="rounded px-1.5 text-slate-400 hover:bg-slate-100"
            title="Schritt nach oben"
          >
            ↑
          </button>
          <button
            onClick={() => moveSchritt(schritt.id, 'down')}
            className="rounded px-1.5 text-slate-400 hover:bg-slate-100"
            title="Schritt nach unten"
          >
            ↓
          </button>
          <button
            onClick={() => removeSchritt(schritt.id)}
            className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Schritt löschen"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {maschinen.map((t, i) => {
          const anteil = aggregate?.entries.find((e) => e.tabelle.id === t.id)
          const auftrag = filter.auftragsnummer.trim()
          const trace = isTraceMode(filter)
          const hatEintrag = trace && t.rows.some((r) => r.auftragsnummer === auftrag)
          return (
            <div
              key={t.id}
              className="rounded-lg"
              style={
                trace
                  ? {
                      opacity: hatEintrag ? 1 : 0.3,
                      outline: hatEintrag ? '2px solid #F56405' : 'none',
                      outlineOffset: '1px',
                    }
                  : undefined
              }
            >
              <DataTable
                title={t.name}
                onRename={(name) => renameProduktionstabelle(t.id, name)}
                onRemove={() => removeProduktionstabelle(t.id)}
                columns={t.columns}
                rows={t.rows}
                onAddColumn={(name, type) => addColumnProduktion(t.id, name, type)}
                onRenameColumn={(cid, name) => renameColumnProduktion(t.id, cid, name)}
                onChangeColumnType={(cid, type) => changeColumnTypeProduktion(t.id, cid, type)}
                onRemoveColumn={(cid) => removeColumnProduktion(t.id, cid)}
                onAddRow={() => addRowProduktion(t.id)}
                onUpdateCell={(ri, cid, v) => updateCellProduktion(t.id, ri, cid, v)}
                onRemoveRow={(ri) => removeRowProduktion(t.id, ri)}
                percent={anteil && aggregate && aggregate.total > 0 ? anteil.percent : null}
                colorClass={MASCHINEN_FARBEN[i % MASCHINEN_FARBEN.length]}
                arbeitsplatz={t.arbeitsplatz}
                onArbeitsplatzChange={(wert) => setProduktionArbeitsplatz(t.id, wert)}
                arbeitsplatzPruefen={(wert) => arbeitsplatzFehlerText(t.id, wert)}
                kopfExtra={
                  hatEintrag ? <DurchlaufWahl tabelle={t} auftragsnummer={auftrag} kompakt /> : undefined
                }
                onKopieren={() => kopiereMaschine(t.id)}
              />
            </div>
          )
        })}

        <div className="flex min-h-[6rem] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300">
          <button
            onClick={() => addProduktionstabelle(schritt.id)}
            className="text-sm text-slate-400 hover:text-zollern-700"
          >
            + Arbeitsplatz
          </button>
          <button
            onClick={() => einfuegenMaschine(schritt.id)}
            className="text-[11px] text-slate-400 hover:text-zollern-700"
            title="Kopierte Maschinentabelle hier einfügen"
          >
            ⧉ Einfügen
          </button>
        </div>
      </div>
    </div>
  )
}
