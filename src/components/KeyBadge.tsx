import type { KeyType } from '../types'

export function KeyBadge({
  type,
  onClick,
  info,
  dark,
}: {
  type: KeyType | null
  onClick?: () => void
  /** Knotenschlüssel (kind:tabelleId:spalteId) für Kontextmenü */
  info?: string
  dark?: boolean
}) {
  const label = type === 'pk' ? 'PK' : type === 'fk' ? 'FK' : '+'
  const color =
    type === 'pk'
      ? 'bg-zollern-500 text-white'
      : type === 'fk'
        ? dark
          ? 'bg-zollern-900/80 text-zollern-200 border border-zollern-700'
          : 'bg-zollern-100 text-zollern-800'
        : dark
          ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
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
