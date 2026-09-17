import { useState } from 'react'
import { useStore } from '../store'
import type { ColumnType } from '../types'
import { emptyInfo } from '../types'
import { InfoFelderListe } from './InfoFelderListe'

interface Props {
  chainId: string
}

/** Allgemeine Produktinfos der aktiven Kette (Tab unter dem Suchblock). */
export function ProduktinfoPanel({ chainId }: Props) {
  const chain = useStore((s) => s.chains.find((c) => c.id === chainId))
  const { addProduktFeld, renameProduktFeld, changeProduktFeldType, removeProduktFeld } = useStore()
  const [bearbeiten, setBearbeiten] = useState(false)

  if (!chain) return null
  const info = chain.info ?? emptyInfo()

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-1 rounded-full bg-zollern-500" />
        <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-zo-ink">
          Produktinfo – {chain.name}
        </h2>
        <button
          onClick={() => setBearbeiten((b) => !b)}
          className={
            bearbeiten
              ? 'rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700'
              : 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100'
          }
        >
          {bearbeiten ? 'Fertig' : 'Bearbeiten'}
        </button>
      </div>
      <InfoFelderListe
        felder={info.felder}
        bearbeiten={bearbeiten}
        onAdd={() => addProduktFeld(chainId)}
        onRename={(id, name) => renameProduktFeld(chainId, id, name)}
        onChangeType={(id, type: ColumnType) => changeProduktFeldType(chainId, id, type)}
        onRemove={(id) => removeProduktFeld(chainId, id)}
      />
      <p className="mt-2 text-[11px] text-slate-400">
        Allgemeine Infos zum Produkt dieser Kette. Änderungen werden automatisch gespeichert.
      </p>
    </section>
  )
}
