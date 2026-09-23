import { useState } from 'react'
import type { Filter } from '../types'
import { EMPTY_FILTER } from '../types'
import { useStore } from '../store'
import { isTraceMode } from '../utils/aggregate'
import { loadFromCloud, saveAllChains, useSyncStatus } from '../lib/sync'
import { fuegeAbteilungEin } from '../lib/tabellenKopie'
import { useSprache, useT } from '../lib/sprache'
import { FilterBar } from '../components/FilterBar'
import { TraceView } from '../components/TraceView'
import { AbteilungBlock } from '../components/AbteilungBlock'
import { TabellenbezogenView } from '../components/TabellenbezogenView'
import { ProduktHinzufuegenView } from '../components/ProduktHinzufuegenView'
import { ProduktinfoPanel } from '../components/ProduktinfoPanel'
import { EditableName } from '../components/EditableName'

type View = 'zusammen' | 'tabellen' | 'produkt'

export function Dashboard() {
  const alleAbteilungen = useStore((s) => s.abteilungen)
  const activeChainId = useStore((s) => s.activeChainId)
  const chains = useStore((s) => s.chains)
  const setActiveChain = useStore((s) => s.setActiveChain)
  const addChain = useStore((s) => s.addChain)
  const renameChain = useStore((s) => s.renameChain)
  const removeChain = useStore((s) => s.removeChain)
  const addAbteilung = useStore((s) => s.addAbteilung)
  const sync = useSyncStatus()
  const t = useT()
  const sprache = useSprache((s) => s.sprache)
  const setSprache = useSprache((s) => s.setSprache)
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER)
  const [view, setView] = useState<View>('zusammen')
  const [produktinfoOffen, setProduktinfoOffen] = useState(false)
  const [hinweis, setHinweis] = useState<string | null>(null)

  const abteilungen = alleAbteilungen.filter((a) => a.chainId === activeChainId)
  const activeChain = chains.find((c) => c.id === activeChainId)

  const handleUpload = async () => {
    await saveAllChains()
  }

  const handleDownload = async () => {
    await loadFromCloud()
  }

  const handleKetteLoeschen = () => {
    if (!activeChain) return
    const anzahlAbteilungen = abteilungen.length
    const frage = t(
      'Prozesskette „{name}" wirklich löschen?\n\nDabei werden {anzahl} Abteilung(en) mit allen Schritten, Arbeitsplätzen und Einträgen sowohl hier als auch in der Cloud entfernt. Das kann nicht rückgängig gemacht werden.',
      { name: activeChain.name, anzahl: anzahlAbteilungen },
    )
    if (!window.confirm(frage)) return
    removeChain(activeChain.id)
    setHinweis(t('Prozesskette „{name}" gelöscht.', { name: activeChain.name }))
    setTimeout(() => setHinweis(null), 5000)
  }

  const busy = sync.phase !== 'idle'
  const statusText = sync.lastError
    ? t('Fehler: {text}', { text: sync.lastError })
    : sync.phase === 'saving'
      ? t('Speichert…')
      : sync.phase === 'loading'
        ? t('Lädt…')
        : sync.lastSavedAt
          ? t('Gespeichert {zeit}', {
              zeit: new Date(sync.lastSavedAt).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            })
          : sync.cloudChecked && sync.cloudEmpty
            ? t('Cloud ist leer')
            : sync.cloudChecked
              ? t('Cloud verbunden')
              : t('Cloud wird geprüft…')

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zo-ink">{t('Dashboard')}</h1>
          <p className="text-sm text-slate-500">
            {t('Fertigungsauftrag als Leitende Nummer – Trace oder Verteilung je Maschine.')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          {/* Zeile 1: Kette */}
          <div className="flex items-center gap-1">
            <span className="w-16 text-right text-[10px] uppercase tracking-wide text-slate-300">
              {t('Kette')}
            </span>
            <select
              value={activeChainId}
              onChange={(e) => setActiveChain(e.target.value)}
              className="max-w-[14rem] rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 outline-none focus:border-zollern-400"
              title={t('Prozesskette wechseln')}
            >
              {chains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <EditableName
              iconOnly
              value={activeChain?.name ?? ''}
              onCommit={(name) => renameChain(activeChainId, name)}
            />
            <button
              onClick={() => addChain()}
              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title={t('Neue Prozesskette')}
            >
              {t('+ Kette')}
            </button>
            <button
              onClick={handleKetteLoeschen}
              disabled={!activeChain}
              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              title={t('Aktuelle Prozesskette löschen (mit Sicherheitsabfrage)')}
            >
              {t('löschen')}
            </button>
          </div>

          {/* Zeile 2: Cloud / Einstellungen */}
          <div className="flex items-center gap-1">
            <span className="w-16 text-right text-[10px] uppercase tracking-wide text-slate-300">Cloud</span>
            <button
              onClick={handleUpload}
              disabled={busy}
              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              title={t('Lokale Daten in die Cloud hochladen')}
            >
              {sync.phase === 'saving' ? t('speichert…') : t('speichern')}
            </button>
            <button
              onClick={handleDownload}
              disabled={busy}
              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              title={t('Stand aus der Cloud laden (ersetzt lokale Daten)')}
            >
              {sync.phase === 'loading' ? t('lädt…') : t('laden')}
            </button>
            {/* Sprachumschalter */}
            <span className="ml-2 flex items-center overflow-hidden rounded border border-slate-200">
              <button
                onClick={() => setSprache('de')}
                className={`px-1.5 py-0.5 text-[10px] font-semibold ${
                  sprache === 'de' ? 'bg-zollern-600 text-white' : 'text-slate-400 hover:bg-slate-100'
                }`}
                title="Deutsch"
              >
                DE
              </button>
              <button
                onClick={() => setSprache('en')}
                className={`px-1.5 py-0.5 text-[10px] font-semibold ${
                  sprache === 'en' ? 'bg-zollern-600 text-white' : 'text-slate-400 hover:bg-slate-100'
                }`}
                title="English"
              >
                EN
              </button>
            </span>
          </div>

          {/* Zeile 3: Abteilung */}
          <div className="flex items-center gap-1">
            <span className="w-16 text-right text-[10px] uppercase tracking-wide text-slate-300">
              {t('Abteilung')}
            </span>
            <button
              onClick={() => addAbteilung()}
              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title={t('Neue Abteilung anlegen')}
            >
              {t('+ Abteilung')}
            </button>
            <button
              onClick={() => fuegeAbteilungEin(activeChainId)}
              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title={t('Kopierte Abteilung in die aktive Kette einfügen')}
            >
              ⧉ {t('einfügen')}
            </button>
          </div>
        </div>
      </header>

      <p className={`text-xs ${sync.lastError ? 'text-red-600' : 'text-slate-500'}`}>{statusText}</p>

      {hinweis && <p className="text-xs text-slate-500">{hinweis}</p>}

      {sync.cloudChecked && sync.cloudEmpty && chains.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>
            {t(
              'Die Cloud ist leer – diese Daten liegen nur in diesem Browser. Lade sie hoch, damit sie auf allen PCs sichtbar sind.',
            )}
          </span>
          <button
            onClick={handleUpload}
            disabled={busy}
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {t('Jetzt hochladen')}
          </button>
        </div>
      )}

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setView('zusammen')}
          className={`px-4 py-2 text-sm font-medium ${
            view === 'zusammen'
              ? 'border-b-2 border-zollern-500 text-zollern-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('Zusammengefasst')}
        </button>
        <button
          onClick={() => setView('tabellen')}
          className={`px-4 py-2 text-sm font-medium ${
            view === 'tabellen'
              ? 'border-b-2 border-zollern-500 text-zollern-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('Tabellenbezogen')}
        </button>
        <button
          onClick={() => setView('produkt')}
          className={`px-4 py-2 text-sm font-medium ${
            view === 'produkt'
              ? 'border-b-2 border-zollern-500 text-zollern-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('Produkt hinzufügen')}
        </button>
      </div>

      {view !== 'produkt' && (
        <>
          <FilterBar filter={filter} onChange={setFilter} onClear={() => setFilter(EMPTY_FILTER)} />

          {/* Produktinfo – Tab direkt unter dem Suchblock */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setProduktinfoOffen((o) => !o)}
              className={`px-4 py-2 text-sm font-medium ${
                produktinfoOffen
                  ? 'border-b-2 border-zollern-500 text-zollern-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t('Produktinfo')}
            </button>
          </div>

          {produktinfoOffen && <ProduktinfoPanel chainId={activeChainId} />}
        </>
      )}

      {view === 'produkt' ? (
        <ProduktHinzufuegenView />
      ) : view === 'zusammen' ? (
        <>
          {isTraceMode(filter) && <TraceView auftragsnummer={filter.auftragsnummer.trim()} />}

          <div className="flex flex-col gap-4">
            {abteilungen.length === 0 && (
              <button
                onClick={() => addAbteilung()}
                className="flex min-h-[10rem] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-zollern-400 hover:bg-zollern-50 hover:text-zollern-700"
              >
                {t('+ Erste Abteilung hinzufügen')}
              </button>
            )}
            {abteilungen.map((a, i) => (
              <AbteilungBlock key={a.id} abteilung={a} filter={filter} index={i} />
            ))}
          </div>
        </>
      ) : (
        <TabellenbezogenView filter={filter} />
      )}
    </div>
  )
}
