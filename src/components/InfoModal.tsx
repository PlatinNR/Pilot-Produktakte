import { lazy, Suspense, useState } from 'react'
import { useStore } from '../store'
import type { ColumnType } from '../types'
import { emptyInfo } from '../types'
import { InfoFelderListe } from './InfoFelderListe'
import { deleteModell, uploadModell } from '../lib/storage'

const ModellViewer = lazy(() =>
  import('./ModellViewer').then((m) => ({ default: m.ModellViewer })),
)

interface Props {
  abteilungId: string
  onClose: () => void
}

export function InfoModal({ abteilungId, onClose }: Props) {
  const abteilung = useStore((s) => s.abteilungen.find((a) => a.id === abteilungId))
  const activeChainId = useStore((s) => s.activeChainId)
  const {
    setAbteilungModel,
    addInfoFeld,
    renameInfoFeld,
    changeInfoFeldType,
    removeInfoFeld,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
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

          <section className="rounded-lg border border-slate-200 p-3">
            <InfoFelderListe
              felder={info.felder}
              bearbeiten={bearbeiten}
              onAdd={() => addInfoFeld(abteilungId)}
              onRename={(id, name) => renameInfoFeld(abteilungId, id, name)}
              onChangeType={(id, type: ColumnType) => changeInfoFeldType(abteilungId, id, type)}
              onRemove={(id) => removeInfoFeld(abteilungId, id)}
            />
            <p className="mt-2 text-[11px] text-slate-400">
              Diese Infos hat jeder Fertigungsauftrag in der Abteilung. Werte werden später je Auftrag erfasst.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
