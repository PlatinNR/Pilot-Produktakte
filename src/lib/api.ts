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
 * Speichert eine Kette. Wurde die serverseitige Version inzwischen von jemand
 * anderem geändert (updated_at weicht ab), wird die fremde Version als
 * „<Name> (Backup <Datum>)" als neue Kette gesichert, bevor überschrieben wird.
 */
export async function saveChain(
  id: string,
  name: string,
  data: ChainData,
  expectedUpdatedAt: string | null,
): Promise<SaveResult> {
  if (!supabase) return { updatedAt: '', backup: false }

  let backup = false
  if (expectedUpdatedAt) {
    const { data: current } = await supabase
      .from('chains')
      .select('updated_at, name, data')
      .eq('id', id)
      .single()
    if (current && current.updated_at !== expectedUpdatedAt) {
      const date = new Date().toLocaleDateString('de-DE')
      await supabase
        .from('chains')
        .insert({ name: `${current.name} (Backup ${date})`, data: current.data })
      backup = true
    }
  }

  const { data: updated } = await supabase
    .from('chains')
    .upsert({ id, name, data }, { onConflict: 'id' })
    .select('updated_at')
    .single()

  return { updatedAt: updated?.updated_at ?? '', backup }
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
