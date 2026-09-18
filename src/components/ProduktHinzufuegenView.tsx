import { useState } from 'react'
import { useStore } from '../store'
import { abteilungFarbe } from '../utils/colors'
import { schleifenInfoFuerSchritt } from '../utils/schleifen'

type Modus = 'manuell' | 'import'

const eingabe =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-zollern-500'
const werteEingabe =
  'w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 outline-none focus:border-zollern-400'

/** Produkt hinzufügen: Fertigungsauftrag manuell anlegen (auch mehrere Durchläufe) oder Maschinendaten importieren. */
export function ProduktHinzufuegenView() {
  const activeChainId = useStore((s) => s.activeChainId)
  const alleAbteilungen = useStore((s) => s.abteilungen)
  const alleSchritte = useStore((s) => s.schritte)
  const alleMaschinen = useStore((s) => s.produktionstabellen)
  const alleBloecke = useStore((s) => s.bearbeitungsbloecke)
  const addProdukt = useStore((s) => s.addProdukt)

  const [modus, setModus] = useState<Modus>('manuell')
  const [auftragsnummer, setAuftragsnummer] = useState('')
  const [fn, setFn] = useState('')
  const [datum, setDatum] = useState('')
  const [auswahl, setAuswahl] = useState<Record<string, boolean>>({})
  const [durchlaeufe, setDurchlaeufe] = useState<Record<string, number>>({})
  const [aktiverDurchlauf, setAktiverDurchlauf] = useState<Record<string, number>>({})
  const [werte, setWerte] = useState<Record<string, Record<string, string>[]>>({})
  const [zeiten, setZeiten] = useState<Record<string, { datum: string; zeit: string }[]>>({})
  const [wiederholungen, setWiederholungen] = useState<Record<string, string[]>>({})
  const [meldung, setMeldung] = useState<string | null>(null)

  const abteilungen = alleAbteilungen.filter((a) => a.chainId === activeChainId)
  const gewaehlt = alleMaschinen.filter((m) => auswahl[m.id])
  const fehlendeZeiten = gewaehlt.filter((m) => {
    const n = durchlaeufe[m.id] ?? 1
    for (let i = 0; i < n; i++) {
      if (!zeiten[m.id]?.[i]?.zeit) return true
    }
    return false
  })
  const kannSpeichern =
    auftragsnummer.trim().length > 0 && gewaehlt.length > 0 && fehlendeZeiten.length === 0
  const gesamtDurchlaeufe = gewaehlt.reduce((sum, m) => sum + (durchlaeufe[m.id] ?? 1), 0)

  const anzahl = (tabelleId: string) => Math.max(1, durchlaeufe[tabelleId] ?? 1)
  const aktiv = (tabelleId: string) =>
    Math.min(aktiverDurchlauf[tabelleId] ?? 0, anzahl(tabelleId) - 1)

  const setAnzahl = (tabelleId: string, n: number) => {
    const v = Math.max(1, Math.min(10, Math.floor(n) || 1))
    setDurchlaeufe((d) => ({ ...d, [tabelleId]: v }))
    setAktiverDurchlauf((a) => ({ ...a, [tabelleId]: Math.min(a[tabelleId] ?? 0, v - 1) }))
  }

  const setWert = (tabelleId: string, index: number, spalteId: string, value: string) =>
    setWerte((w) => {
      const liste = [...(w[tabelleId] ?? [])]
      while (liste.length <= index) liste.push({})
      liste[index] = { ...liste[index], [spalteId]: value }
      return { ...w, [tabelleId]: liste }
    })

  const zeitFuer = (tabelleId: string, index: number) =>
    zeiten[tabelleId]?.[index] ?? { datum: '', zeit: '' }

  const setZeit = (tabelleId: string, index: number, patch: Partial<{ datum: string; zeit: string }>) =>
    setZeiten((z) => {
      const liste = [...(z[tabelleId] ?? [])]
      while (liste.length <= index) liste.push({ datum: '', zeit: '' })
      liste[index] = { ...liste[index], ...patch }
      return { ...z, [tabelleId]: liste }
    })

  const wdhFuer = (tabelleId: string, index: number) => wiederholungen[tabelleId]?.[index] ?? '1'

  const setWdh = (tabelleId: string, index: number, wert: string) =>
    setWiederholungen((w) => {
      const liste = [...(w[tabelleId] ?? [])]
      while (liste.length <= index) liste.push('1')
      liste[index] = wert
      return { ...w, [tabelleId]: liste }
    })

  const speichern = () => {
    if (!kannSpeichern) return
    const eintraege = gewaehlt.map((m) => {
      const st = alleSchritte.find((x) => x.id === m.schrittId)
      const eigene = m.columns.filter((c) => !c.fixed)
      const namen = new Set(eigene.map((c) => c.name.trim().toLowerCase()))
      const extra = (st?.columns ?? []).filter((c) => !namen.has(c.name.trim().toLowerCase()))
      const n = anzahl(m.id)
      return {
        tabelleId: m.id,
        durchlaeufe: Array.from({ length: n }, (_, i) => {
          const z = zeitFuer(m.id, i)
          return {
            datum: z.datum || datum,
            zeit: z.zeit,
            wiederholung: wdhFuer(m.id, i),
            spalten: werte[m.id]?.[i] ?? {},
          }
        }),
        extraSpalten: extra.map((c) => ({ id: c.id, name: c.name, type: c.type })),
      }
    })
    addProdukt(auftragsnummer.trim(), fn.trim(), datum, eintraege)
    setMeldung(
      `„${auftragsnummer.trim()}" wurde bei ${gewaehlt.length} Maschine(n) mit ${gesamtDurchlaeufe} Durchlauf/Durchläufen eingetragen.`,
    )
    setAuftragsnummer('')
    setFn('')
    setDatum('')
    setAuswahl({})
    setDurchlaeufe({})
    setAktiverDurchlauf({})
    setWerte({})
    setZeiten({})
    setWiederholungen({})
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setModus('manuell')}
          className={`px-4 py-2 text-sm font-medium ${
            modus === 'manuell'
              ? 'border-b-2 border-zollern-500 text-zollern-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Produkt manuell hinzufügen
        </button>
        <button
          onClick={() => setModus('import')}
          className={`px-4 py-2 text-sm font-medium ${
            modus === 'import'
              ? 'border-b-2 border-zollern-500 text-zollern-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Maschinendaten importieren
        </button>
      </div>

      {modus === 'import' ? (
        <div className="flex min-h-[12rem] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
          <span className="text-sm font-medium">Import von Maschinendaten</span>
          <span className="text-xs">Dieser Modus ist noch leer – kommt später (z. B. CSV-Import).</span>
        </div>
      ) : (
        <>
          <section className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Fertigungsauftrag *
              </span>
              <input
                value={auftragsnummer}
                onChange={(e) => setAuftragsnummer(e.target.value)}
                placeholder="z. B. AUF-1007"
                className={eingabe}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">FN</span>
              <input value={fn} onChange={(e) => setFn(e.target.value)} placeholder="z. B. F-100" className={eingabe} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Datum</span>
              <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={eingabe} />
            </label>
            <button
              onClick={speichern}
              disabled={!kannSpeichern}
              className="rounded-lg bg-zollern-700 px-4 py-2 text-sm font-medium text-white hover:bg-zollern-800 disabled:opacity-50"
            >
              Produkt hinzufügen
            </button>
            <span className="text-xs text-slate-400">
              {gewaehlt.length} Maschine(n) · {gesamtDurchlaeufe} Durchlauf/Durchläufe
            </span>
            {fehlendeZeiten.length > 0 && (
              <span className="text-xs text-red-600">
                Uhrzeit fehlt bei: {fehlendeZeiten.map((m) => m.name).join(', ')}
              </span>
            )}
          </section>

          {meldung && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {meldung}
            </div>
          )}

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Maschinen auswählen, Durchläufe und benutzte Werte eintragen
            </h3>
            {abteilungen.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                Keine Abteilungen vorhanden.
              </div>
            )}
            {abteilungen.map((a, index) => {
              const schritteDerAbt = alleSchritte.filter((st) => st.abteilungId === a.id)
              const hatMaschinen = schritteDerAbt.some((st) =>
                alleMaschinen.some((m) => m.schrittId === st.id),
              )
              if (!hatMaschinen) return null
              return (
                <div key={a.id} className={`rounded-xl border p-3 ${abteilungFarbe(index)}`}>
                  <h4 className="mb-2 text-sm font-bold text-zo-ink">{a.name}</h4>
                  <div className="flex flex-col gap-3">
                    {schritteDerAbt.map((st) => {
                      const maschinen = alleMaschinen.filter((m) => m.schrittId === st.id)
                      if (maschinen.length === 0) return null
                      const inSchleife = schleifenInfoFuerSchritt(st.id, alleSchritte, alleBloecke).inSchleife
                      return (
                        <div key={st.id}>
                          <p className="mb-1 text-xs font-semibold text-slate-600">{st.name}</p>
                          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                            {maschinen.map((m) => {
                              const eigeneSpalten = m.columns.filter((c) => !c.fixed)
                              const namen = new Set(eigeneSpalten.map((c) => c.name.trim().toLowerCase()))
                              const schrittFelder = st.columns.filter(
                                (c) => !namen.has(c.name.trim().toLowerCase()),
                              )
                              const bereitsVorhanden =
                                auftragsnummer.trim().length > 0 &&
                                m.rows.some((r) => r.auftragsnummer === auftragsnummer.trim())
                              const n = anzahl(m.id)
                              const d = aktiv(m.id)
                              const aktuelleWerte = werte[m.id]?.[d] ?? {}
                              const z = zeitFuer(m.id, d)
                              const durchlaufLabel = n > 1 ? ` (Durchlauf ${d + 1})` : ''
                              return (
                                <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-2">
                                  <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={!!auswahl[m.id]}
                                      onChange={(e) =>
                                        setAuswahl((x) => ({ ...x, [m.id]: e.target.checked }))
                                      }
                                      className="h-4 w-4 accent-zollern-600"
                                    />
                                    <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
                                    <span
                                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                                        m.arbeitsplatz ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-600'
                                      }`}
                                      title="Arbeitsplatz-Nummer der Maschine"
                                    >
                                      {m.arbeitsplatz ? `AP ${m.arbeitsplatz}` : 'AP fehlt'}
                                    </span>
                                    {bereitsVorhanden && (
                                      <span
                                        className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700"
                                        title="Für diesen Auftrag existiert bei dieser Maschine schon ein Eintrag"
                                      >
                                        bereits vorhanden
                                      </span>
                                    )}
                                  </label>

                                  {auswahl[m.id] && (
                                    <>
                                      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                          Durchläufe
                                        </span>
                                        <input
                                          type="number"
                                          min={1}
                                          max={10}
                                          value={n}
                                          onChange={(e) => setAnzahl(m.id, Number(e.target.value))}
                                          className="w-14 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700 outline-none focus:border-zollern-400"
                                          title="Anzahl der Durchläufe (Arbeitswiederholungen) an dieser Maschine"
                                        />
                                        {inSchleife && (
                                          <label className="flex items-center gap-1">
                                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                              Wiederholung
                                            </span>
                                            <select
                                              value={wdhFuer(m.id, d)}
                                              onChange={(e) => setWdh(m.id, d, e.target.value)}
                                              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700"
                                              title="Welche Wiederholung der Schleife ist dieser Eintrag?"
                                            >
                                              {Array.from({ length: 10 }, (_, i) => (
                                                <option key={i} value={String(i + 1)}>
                                                  {i + 1}
                                                </option>
                                              ))}
                                            </select>
                                          </label>
                                        )}
                                        {n > 1 && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-slate-400">Werte für:</span>
                                            {Array.from({ length: n }, (_, i) => (
                                              <button
                                                key={i}
                                                onClick={() =>
                                                  setAktiverDurchlauf((a2) => ({ ...a2, [m.id]: i }))
                                                }
                                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                                  d === i
                                                    ? 'bg-zollern-700 text-white'
                                                    : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                                                }`}
                                              >
                                                Durchlauf {i + 1}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="mt-2 grid grid-cols-2 gap-2">
                                        <label className="flex flex-col gap-0.5">
                                          <span className="text-[10px] text-slate-500">Datum{durchlaufLabel}</span>
                                          <input
                                            type="date"
                                            value={z.datum || datum}
                                            onChange={(e) => setZeit(m.id, d, { datum: e.target.value })}
                                            className={werteEingabe}
                                          />
                                        </label>
                                        <label className="flex flex-col gap-0.5">
                                          <span className="text-[10px] text-slate-500">
                                            Uhrzeit{durchlaufLabel} *
                                          </span>
                                          <input
                                            type="time"
                                            value={z.zeit}
                                            onChange={(e) => setZeit(m.id, d, { zeit: e.target.value })}
                                            className={`w-full rounded border bg-white px-1.5 py-1 text-xs text-slate-700 outline-none focus:border-zollern-400 ${
                                              z.zeit ? 'border-slate-200' : 'border-red-300'
                                            }`}
                                            title="Pflicht: Uhrzeit des Ablaufs an dieser Maschine (für die Reihenfolge)"
                                          />
                                        </label>
                                      </div>
                                      <div className="mt-2 grid grid-cols-2 gap-2">
                                        {eigeneSpalten.length === 0 && schrittFelder.length === 0 && (
                                          <p className="col-span-2 text-[11px] text-slate-400">
                                            Keine eigenen Wertspalten an dieser Maschine.
                                          </p>
                                        )}
                                        {eigeneSpalten.map((c) => (
                                          <label key={c.id} className="flex flex-col gap-0.5">
                                            <span className="text-[10px] text-slate-500">{c.name}</span>
                                            <input
                                              value={aktuelleWerte[c.id] ?? ''}
                                              onChange={(e) => setWert(m.id, d, c.id, e.target.value)}
                                              type={
                                                c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'
                                              }
                                              className={werteEingabe}
                                            />
                                          </label>
                                        ))}
                                        {schrittFelder.map((c) => (
                                          <label key={c.id} className="flex flex-col gap-0.5">
                                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                              {c.name}
                                              <span
                                                className="rounded bg-sky-100 px-1 text-[9px] text-sky-700"
                                                title="Feld ist im Schritt definiert und wird beim Speichern an der Maschine ergänzt"
                                              >
                                                aus Schritt
                                              </span>
                                            </span>
                                            <input
                                              value={aktuelleWerte[c.id] ?? ''}
                                              onChange={(e) => setWert(m.id, d, c.id, e.target.value)}
                                              type={
                                                c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'
                                              }
                                              className={werteEingabe}
                                            />
                                          </label>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}
