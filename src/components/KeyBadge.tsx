import type { KeyType } from '../types'

export function KeyBadge({
  type,
  onClick,
  info,
}: {
  type: KeyType | null
  onClick?: () => void
  /** Knotenschlüssel (kind:tabelleId:spalteId) für Kontextmenü */
  info?: string
}) {
  const label = type === 'pk' ? 'PK' : type === 'fk' ? 'FK' : '+'
  const color =
    type === 'pk'
      ? 'bg-zollern-500 text-white'
      : type === 'fk'
        ? 'bg-zollern-100 text-zollern-800'
        : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
  const title =
    type === 'pk'
      ? 'Primärschlüssel – Rechtsklick für Beziehungen'
      : type === 'fk'
        ? 'Fremdschlüssel – Rechtsklick für Beziehungen'
        : 'Schlüssel setzen'
  const cls = `inline-flex items-center rounded px-1 text-[9px] font-bold leading-4 ${color}`
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      data-key-node={info}
      className={cls}
      title={title}
    >
      {label}
    </button>
  ) : (
    <span data-key-node={info} className={cls} title={title}>
      {label}
    </span>
  )
}
