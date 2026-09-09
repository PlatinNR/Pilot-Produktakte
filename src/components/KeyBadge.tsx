import type { KeyType } from '../types'

export function KeyBadge({ type, onClick }: { type: KeyType | null; onClick?: () => void }) {
  const label = type === 'pk' ? 'PK' : type === 'fk' ? 'FK' : '+'
  const color =
    type === 'pk'
      ? 'bg-zollern-500 text-white'
      : type === 'fk'
        ? 'bg-zollern-100 text-zollern-800'
        : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
  const title =
    type === 'pk' ? 'Primärschlüssel' : type === 'fk' ? 'Fremdschlüssel' : 'Schlüssel setzen'
  const cls = `inline-flex items-center rounded px-1 text-[9px] font-bold leading-4 ${color}`
  return onClick ? (
    <button type="button" onClick={onClick} className={cls} title={title}>
      {label}
    </button>
  ) : (
    <span className={cls} title={title}>
      {label}
    </span>
  )
}
