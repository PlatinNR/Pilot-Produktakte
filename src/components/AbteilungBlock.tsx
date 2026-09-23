import { useState } from 'react'
import type { Abteilung, Filter } from '../types'
import { useStore } from '../store'
import { EditableName } from './EditableName'
import { SchrittRow } from './SchrittRow'
import { NebentabellenColumn } from './NebentabellenColumn'
import { InfoModal } from './InfoModal'
import { abteilungFarbe } from '../utils/colors'
import { kopiereAbteilung } from '../lib/tabellenKopie'
import { useT } from '../lib/sprache'

interface Props {
  abteilung: Abteilung
  filter: Filter
  index: number
}

export function AbteilungBlock({ abteilung, filter, index }: Props) {
  const t = useT()
  const alleSchritte = useStore((s) => s.schritte)
  const alleBloecke = useStore((s) => s.bearbeitungsbloecke)
  const [infoOffen, setInfoOffen] = useState(false)
  const schritte = alleSchritte.filter((st) => st.abteilungId === abteilung.id)
  const bloecke = alleBloecke.filter((b) => b.abteilungId === abteilung.id)
  const {
    renameAbteilung,
    removeAbteilung,
    addSchritt,
    addBearbeitungsblock,
    renameBearbeitungsblock,
    removeBearbeitungsblock,
    moveBearbeitungsblock,
  } = useStore()

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
    <section className={`rounded-xl border shadow-sm ${abteilungFarbe(index)}`}>
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="h-3 w-1 rounded-full bg-zollern-700" />
        <button
          onClick={() => setInfoOffen(true)}
          className="rounded border border-slate-300 bg-white/70 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-white"
          title={t('Info anzeigen')}
        >
          {t('Info')}
        </button>
        <button
          onClick={() => kopiereAbteilung(abteilung.id)}
          className="rounded border border-slate-300 bg-white/70 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-white"
          title={t('Abteilung kopieren (in eine andere Kette einfügbar)')}
        >
          ⧉ Copy
        </button>
        <EditableName
          value={abteilung.name}
          onCommit={(name) => renameAbteilung(abteilung.id, name)}
          className="min-w-0 flex-1 bg-transparent text-lg font-bold text-zo-ink outline-none"
        />
        <button
          onClick={() => addSchritt(abteilung.id)}
          className="rounded bg-zollern-700 px-3 py-1 text-xs font-medium text-white hover:bg-zollern-800"
        >
          {t('+ Schritt')}
        </button>
        <button
          onClick={() => addBearbeitungsblock(abteilung.id)}
          className="rounded border border-zollern-700 px-3 py-1 text-xs font-medium text-zollern-700 hover:bg-zollern-50"
        >
          {t('+ Variabler Block')}
        </button>
        <button
          onClick={() => removeAbteilung(abteilung.id)}
          className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
          title={t('Abteilung löschen')}
        >
          ✕
        </button>
      </header>

      <div className="flex flex-col gap-4 p-4 lg:flex-row">
        <main className="min-w-0 flex-1">
          {renderItems.length === 0 ? (
            <button
              onClick={() => addSchritt(abteilung.id)}
              className="flex min-h-[6rem] w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-400 hover:border-zollern-400 hover:bg-zollern-50 hover:text-zollern-700"
            >
              {t('Ersten Produktionsschritt hinzufügen')}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              {renderItems.map((item) => {
                if (item.type === 'block') {
                  const blockSteps = schritte.filter((x) => x.blockId === item.block.id).sort((x, y) => y.position - x.position)
                  return (
                    <div
                      key={`block-${item.block.id}`}
                      className="rounded-lg border border-zollern-200 bg-zollern-50/40 p-2"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-zollern-400" />
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-zollern-500">
                          {t('Variabler Block')}
                        </span>
                        <EditableName
                          value={item.block.name}
                          onCommit={(name) => renameBearbeitungsblock(item.block.id, name)}
                          className="min-w-0 flex-1 text-xs font-semibold text-zollern-800 outline-none"
                        />
                        <button
                          onClick={() => moveBearbeitungsblock(item.block.id, 'up')}
                          className="rounded px-1 text-slate-400 hover:bg-slate-100"
                          title={t('Block nach oben')}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveBearbeitungsblock(item.block.id, 'down')}
                          className="rounded px-1 text-slate-400 hover:bg-slate-100"
                          title={t('Block nach unten')}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => addSchritt(abteilung.id, item.block.id)}
                          className="rounded bg-zollern-700 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-zollern-800"
                        >
                          {t('+ Schritt')}
                        </button>
                        <button
                          onClick={() => removeBearbeitungsblock(item.block.id)}
                          className="rounded px-1 text-slate-400 hover:text-red-500"
                          title={t('Block löschen')}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="overflow-x-auto pb-1" style={{ direction: 'rtl' }}>
                        <div className="flex items-start gap-3" style={{ direction: 'ltr' }}>
                          {blockSteps.map((st) => (
                            <div key={st.id} className="w-80 shrink-0">
                              <SchrittRow schritt={st} filter={filter} />
                            </div>
                          ))}
                          {blockSteps.length === 0 && (
                            <div className="flex min-h-[6rem] w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400">
                              {t('+ Schritt über den Button oben hinzufügen')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }
                return <SchrittRow key={item.st.id} schritt={item.st} filter={filter} />
              })}
            </div>
          )}
        </main>

        <NebentabellenColumn abteilungId={abteilung.id} />
      </div>
      {infoOffen && <InfoModal abteilungId={abteilung.id} onClose={() => setInfoOffen(false)} />}
    </section>
  )
}
