import { supabase } from './supabase'
import type { ChainData } from '../types'

export interface ChainRecord {
  id: string
  name: string
  data: ChainData
  updated_at: string
}

export async function listChains(): Promise<ChainRecord[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('chains').select('*').order('created_at')
  if (error) throw error
  return (data ?? []) as ChainRecord[]
}

export async function createChain(id: string, name: string, data: ChainData): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('chains').insert({ id, name, data })
  if (error) throw error
}

export interface SaveResult {
  updatedAt: string
  backup: boolean
}

/**
 * Speichert eine Kette (ein Datensatz je Kette).
 * Hinweis: Es werden keine Backup-Datensätze mehr angelegt – diese hatten bei
 * identischen IDs zu vervielfachten Einträgen beim Laden geführt.
 */
export async function saveChain(id: string, name: string, data: ChainData): Promise<SaveResult> {
  if (!supabase) return { updatedAt: '', backup: false }

  const { data: updated, error } = await supabase
    .from('chains')
    .upsert({ id, name, data }, { onConflict: 'id' })
    .select('updated_at')
    .single()
  if (error) throw error

  return { updatedAt: updated?.updated_at ?? '', backup: false }
}

export async function renameChain(id: string, name: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('chains').update({ name }).eq('id', id)
  if (error) throw error
}

export async function deleteChain(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('chains').delete().eq('id', id)
  if (error) throw error
}
