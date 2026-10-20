import { toPng, toSvg } from 'html-to-image'
import type { AppState } from '../types'

/**
 * Filtert rein interaktive oder temporäre Menü-Elemente beim Export heraus.
 */
function exportFilter(node: HTMLElement): boolean {
  if (node.classList?.contains('export-ignore')) return false
  return true
}

/**
 * Exportiert das übergebene DOM-Element als hochauflösendes PNG-Bild.
 */
export async function exportiereAlsPng(
  element: HTMLElement,
  dateiname: string = 'Prozesskette',
): Promise<void> {
  const width = Math.max(element.scrollWidth, element.offsetWidth)
  const height = Math.max(element.scrollHeight, element.offsetHeight)

  const dataUrl = await toPng(element, {
    backgroundColor: '#f8f8f8',
    skipFonts: true,
    pixelRatio: 1.5,
    width,
    height,
    filter: exportFilter,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      maxWidth: 'none',
    },
  })
  const link = document.createElement('a')
  link.download = `${dateiname.replace(/[/\\?%*:|"<>]/g, '_')}.png`
  link.href = dataUrl
  link.click()
}

/**
 * Exportiert das übergebene DOM-Element als skalierbare SVG-Vektorgrafik.
 */
export async function exportiereAlsSvg(
  element: HTMLElement,
  dateiname: string = 'Prozesskette',
): Promise<void> {
  const width = Math.max(element.scrollWidth, element.offsetWidth)
  const height = Math.max(element.scrollHeight, element.offsetHeight)

  const dataUrl = await toSvg(element, {
    backgroundColor: '#f8f8f8',
    skipFonts: true,
    width,
    height,
    filter: exportFilter,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      maxWidth: 'none',
    },
  })
  const link = document.createElement('a')
  link.download = `${dateiname.replace(/[/\\?%*:|"<>]/g, '_')}.svg`
  link.href = dataUrl
  link.click()
}

/**
 * Exportiert die Daten der aktiven Prozesskette als formatierte JSON-Datei.
 */
export function exportiereAlsJson(
  state: AppState,
  chainId: string,
  dateiname: string = 'Prozesskette',
): void {
  const chain = state.chains.find((c) => c.id === chainId)
  const abteilungen = state.abteilungen.filter((a) => a.chainId === chainId)
  const abtIds = new Set(abteilungen.map((a) => a.id))
  const bloecke = state.bearbeitungsbloecke.filter((b) => abtIds.has(b.abteilungId))
  const schritte = state.schritte.filter((s) => abtIds.has(s.abteilungId))
  const schrittIds = new Set(schritte.map((s) => s.id))
  const produktionstabellen = state.produktionstabellen.filter((t) => schrittIds.has(t.schrittId))
  const nebentabellen = state.nebentabellen.filter((n) => abtIds.has(n.abteilungId))

  const exportDaten = {
    typ: 'produktakte-prozesskette',
    version: 1,
    exportiertAm: new Date().toISOString(),
    kette: chain ? { id: chain.id, name: chain.name } : null,
    abteilungen,
    bearbeitungsbloecke: bloecke,
    schritte,
    produktionstabellen,
    nebentabellen,
  }

  const blob = new Blob([JSON.stringify(exportDaten, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `${dateiname.replace(/[/\\?%*:|"<>]/g, '_')}.json`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
