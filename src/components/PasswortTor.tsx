import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useT } from '../lib/sprache'

const PASSWORT = 'Zollern26Pilot'

/** Einfaches Passwort-Tor (nur clientseitig, kein echter Schutz). Fragt bei jedem Laden neu. */
export function PasswortTor({ children }: { children: ReactNode }) {
  const t = useT()
  const [freigeschaltet, setFreigeschaltet] = useState(false)
  const [eingabe, setEingabe] = useState('')
  const [fehler, setFehler] = useState(false)

  if (freigeschaltet) return <>{children}</>

  const pruefen = (e: FormEvent) => {
    e.preventDefault()
    if (eingabe === PASSWORT) {
      setFreigeschaltet(true)
    } else {
      setFehler(true)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-zo-bg-lighter p-6">
      <form
        onSubmit={pruefen}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-zollern-500 text-lg font-black text-white">
            Z
          </span>
          <div className="leading-tight">
            <div className="text-base font-bold tracking-widest text-zo-ink">ZOLLERN</div>
            <div className="text-[11px] text-zo-muted">{t('Digitale Produktakte')}</div>
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {t('Passwort')}
          </span>
          <input
            type="password"
            value={eingabe}
            onChange={(e) => {
              setEingabe(e.target.value)
              setFehler(false)
            }}
            autoFocus
            className={`rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-zollern-500 ${
              fehler ? 'border-red-400' : 'border-slate-300'
            }`}
          />
        </label>

        {fehler && <p className="text-xs text-red-600">{t('Falsches Passwort.')}</p>}

        <button
          type="submit"
          className="rounded-lg bg-zollern-700 px-4 py-2 text-sm font-medium text-white hover:bg-zollern-800"
        >
          {t('Öffnen')}
        </button>
      </form>
    </div>
  )
}
