import { supabase } from './supabase'

/** Bucket-Name in Supabase Storage (öffentlich lesbar). */
export const MODELL_BUCKET = 'models'

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_')
}

/** Lädt eine GLB/glTF-Datei in den Bucket und liefert die öffentliche URL zurück. */
export async function uploadModell(
  chainId: string,
  abteilungId: string,
  file: File,
): Promise<{ url: string; name: string }> {
  if (!supabase) throw new Error('Supabase ist nicht konfiguriert.')
  const path = `${chainId}/${abteilungId}/${Date.now()}-${safeFileName(file.name)}`
  const { error } = await supabase.storage.from(MODELL_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'model/gltf-binary',
  })
  if (error) throw error
  const { data } = supabase.storage.from(MODELL_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, name: file.name }
}

/** Löscht eine zuvor hochgeladene Modelldatei (best effort). */
export async function deleteModell(url: string): Promise<void> {
  if (!supabase) return
  const marker = `/object/public/${MODELL_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx < 0) return
  const path = decodeURIComponent(url.slice(idx + marker.length))
  await supabase.storage.from(MODELL_BUCKET).remove([path])
}
