import type { KeyType, TableKey } from '../types'

export function keyTypeOf(keys: TableKey[] | undefined, columnId: string): KeyType | null {
  return keys?.find((k) => k.columnId === columnId)?.type ?? null
}

export function nextKey(current: KeyType | null): KeyType | null {
  if (current === null) return 'pk'
  if (current === 'pk') return 'fk'
  return null
}
