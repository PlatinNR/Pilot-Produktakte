import { useKopieStatus } from '../lib/tabellenKopie'

/** Kleiner Hinweis unten rechts (Kopieren/Einfügen von Tabellen). */
export function KopierToast() {
  const text = useKopieStatus()
  if (!text) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white shadow-lg">
      {text}
    </div>
  )
}
