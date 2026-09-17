import { lazy, Suspense, useState } from 'react'
import { useStore } from '../store'
import type { ColumnType } from '../types'
import { emptyInfo } from '../types'
import { deleteModell, uploadModell } from '../lib/storage'

const ModellViewer = lazy(() =>
  import('./ModellViewer').then((m) => ({ default: m.ModellViewer })),
)

interface Props {
  abteilungId: string
  onClose: () => void
}

const feldInput =
  'min-w-0 flex-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700 outline-none focus:border-zollern-400'

export function InfoModal({ abteilungId, onClose }: Props) {
  const abteilung = useStore((s) => s.abteilungen.find((a) => a.id === abteilungId))
  const activeChainId = useStore((s) => s.activeChainId)
  const {
    setAbteilungModel,
    addInfoFeld,
    renameInfoFeld,
    changeInfoFeldType,
    setInfoFeldValue,
    removeInfoFeld,
    addInfoTabelle,
    renameInfoTabelle,
    removeInfoTabelle,
    addInfoSpalte,
    renameInfoSpalte,
    changeInfoSpalteType,
    removeInfoSpalte,
    addInfoZeile,
    setInfoZeile,
    removeInfoZeile,
  } = useStore()
  const [bearbeiten, setBearbeiten] = useState(false)
  const [uploadLaeuft, setUploadLaeuft] = useState(false)
  const [uploadFehler, setUploadFehler] = useState<string | null>(null)

  if (!abteilung) return null
  const info = abteilung.info ?? emptyInfo()

  const handleUpload = async (file: File | null) => {
    if (!file) return
    setUploadFehler(null)
    setUploadLaeuft(true)
    try {
      const { url, name } = await uploadModell(activeChainId, abteilungId, file)
      setAbteilungModel(abteilungId, url, name)
    } catch (e) {
      setUploadFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setUploadLaeuft(false)
    }
  }

  const handleModellEntfernen = async () => {
    if (info.modelUrl) await deleteModell(info.modelUrl)
    setAbteilungModel(abteilungId, null, null)
  }

  const typOptionen = (
    <>
      <option value="text">Text</option>
      <option value="number">Zahl</option>
      <option value="date">Datum</option>
    </>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <span className="h-3 w-1 rounded-full bg-zollern-500" />
          <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-zo-ink">Info – {abteilung.name}</h2>
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
          <button
            onClick={onClose}
            className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Schließen"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto p-4">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">3D-Modell (CAD)</h3>
            {info.modelUrl ? (
              <Suspense
                fallback={
                  <div className="flex h-72 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500">
                    3D-Anzeige lädt…
                  </div>
                }
              >
                <ModellViewer url={info.modelUrl} />
              </Suspense>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400">
                Kein Modell hinterlegt
              </div>
            )}
            {info.modelName && <p className="text-xs text-slate-400">Datei: {info.modelName}</p>}
            {bearbeiten && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                  onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
                  className="text-xs text-slate-600"
                />
                {uploadLaeuft && <span className="text-xs text-slate-500">Lädt hoch…</span>}
                {info.modelUrl && (
                  <button
                    onClick={handleModellEntfernen}
                    className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    Modell entfernen
                  </button>
                )}
              </div>
            )}
            {uploadFehler && (
              <p className="text-xs text-red-600">
                Upload fehlgeschlagen: {uploadFehler} (Bucket „models" in Supabase angelegt?)
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Infos</h3>
              {bearbeiten && (
                <button
                  onClick={() => addInfoFeld(abteilungId)}
                  className="rounded border border-zollern-700 px-2 py-0.5 text-xs font-medium text-zollern-700 hover:bg-zollern-50"
                >
                  + Info
                </button>
              )}
            </div>
            {info.felder.length === 0 && (
              <p className="text-xs text-slate-400">
                Noch keine Infos{bearbeiten ? ' – mit „+ Info" anlegen.' : ' – über „Bearbeiten" hinzufügen.'}
              </p>
            )}
            <div className="flex flex-col gap-1">
              {info.felder.map((f) => (
                <div
                  key={f.id}
                  className="grid grid-cols-[11rem_1fr] items-center gap-2 rounded border border-slate-100 px-2 py-1"
                >
                  {bearbeiten ? (
                    <>
                      <input
                        value={f.name}
                        onChange={(e) => renameInfoFeld(abteilungId, f.id, e.target.value)}
                        className={feldInput}
                        placeholder="Name"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={f.type}
                          onChange={(e) => changeInfoFeldType(abteilungId, f.id, e.target.value as ColumnType)}
                          className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-700"
                        >
                          {typOptionen}
                        </select>
                        <input
                          value={f.value}
                          onChange={(e) => setInfoFeldValue(abteilungId, f.id, e.target.value)}
                          type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                          className={feldInput}
                          placeholder="Wert"
                        />
                        <button
                          onClick={() => removeInfoFeld(abteilungId, f.id)}
                          className="shrink-0 rounded px-1 text-slate-400 hover:text-red-500"
                          title="Info löschen"
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="truncate text-sm text-slate-500">{f.name}</span>
                      <span className="text-sm font-medium text-slate-800">{f.value || '–'}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tabellen (z. B. Trauben)
              </h3>
              {bearbeiten && (
                <button
                  onClick={() => addInfoTabelle(abteilungId)}
                  className="rounded border border-zollern-700 px-2 py-0.5 text-xs font-medium text-zollern-700 hover:bg-zollern-50"
                >
                  + Tabelle
                </button>
              )}
            </div>
            {info.tabellen.length === 0 && (
              <p className="text-xs text-slate-400">
                Noch keine Tabellen{bearbeiten ? ' – mit „+ Tabelle" anlegen.' : ' – über „Bearbeiten" hinzufügen.'}
              </p>
            )}
            {info.tabellen.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-200 p-2">
                <div className="mb-1 flex items-center gap-2">
                  {bearbeiten ? (
                    <>
                      <input
                        value={t.name}
                        onChange={(e) => renameInfoTabelle(abteilungId, t.id, e.target.value)}
                        className={feldInput}
                        placeholder="Tabellenname"
                      />
                      <button
                        onClick={() => removeInfoTabelle(abteilungId, t.id)}
                        className="shrink-0 rounded px-1 text-slate-400 hover:text-red-500"
                        title="Tabelle löschen"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-slate-700">{t.name}</span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {t.spalten.map((c) => (
                          <th
                            key={c.id}
                            className="border-b border-slate-100 px-1 py-1 text-left text-xs font-semibold text-slate-500"
                          >
                            {bearbeiten ? (
                              <span className="flex items-center gap-1">
                                <input
                                  value={c.name}
                                  onChange={(e) => renameInfoSpalte(abteilungId, t.id, c.id, e.target.value)}
                                  className={feldInput}
                                />
                                <select
                                  value={c.type}
                                  onChange={(e) =>
                                    changeInfoSpalteType(abteilungId, t.id, c.id, e.target.value as ColumnType)
                                  }
                                  className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-700"
                                >
                                  {typOptionen}
                                </select>
                                <button
                                  onClick={() => removeInfoSpalte(abteilungId, t.id, c.id)}
                                  className="shrink-0 rounded px-0.5 text-slate-400 hover:text-red-500"
                                  title="Spalte löschen"
                                >
                                  ✕
                                </button>
                              </span>
                            ) : (
                              c.name
                            )}
                          </th>
                        ))}
                        {bearbeiten && <th className="w-6" />}
                      </tr>
                    </thead>
                    <tbody>
                      {t.zeilen.map((z, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          {t.spalten.map((c) => (
                            <td key={c.id} className="px-1 py-0.5 text-slate-700">
                              {bearbeiten ? (
                                <input
                                  value={z[c.id] ?? ''}
                                  onChange={(e) => setInfoZeile(abteilungId, t.id, i, c.id, e.target.value)}
                                  type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'}
                                  className={feldInput}
                                />
                              ) : (
                                (z[c.id] || '–')
                              )}
                            </td>
                          ))}
                          {bearbeiten && (
                            <td className="px-1">
                              <button
                                onClick={() => removeInfoZeile(abteilungId, t.id, i)}
                                className="rounded px-1 text-slate-400 hover:text-red-500"
                                title="Zeile löschen"
                              >
                                ✕
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bearbeiten && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => addInfoZeile(abteilungId, t.id)}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                    >
                      + Zeile
                    </button>
                    <button
                      onClick={() => addInfoSpalte(abteilungId, t.id, 'Spalte', 'text')}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                    >
                      + Spalte
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>

          <p className="text-[11px] text-slate-400">
            Änderungen werden automatisch gespeichert
            {bearbeiten ? ' – „Fertig" schließt den Bearbeitungsmodus.' : '.'}
          </p>
        </div>
      </div>
    </div>
  )
}
