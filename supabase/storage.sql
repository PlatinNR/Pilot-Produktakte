-- ============================================================
-- Digitale Produktakte – Supabase Storage für 3D-Modelle (GLB/glTF)
-- 1) In der Supabase-Konsole: Storage -> "New bucket"
--      Name:   models
--      Public: JA (öffentlich lesbar)
-- 2) Danach dieses Skript im SQL Editor ausführen.
-- ============================================================

drop policy if exists "models_read" on storage.objects;
drop policy if exists "models_insert" on storage.objects;
drop policy if exists "models_update" on storage.objects;
drop policy if exists "models_delete" on storage.objects;

-- Keine Anmeldung: Lesen und Schreiben für alle erlaubt (wie bei public.chains)
create policy "models_read" on storage.objects
  for select using (bucket_id = 'models');

create policy "models_insert" on storage.objects
  for insert with check (bucket_id = 'models');

create policy "models_update" on storage.objects
  for update using (bucket_id = 'models');

create policy "models_delete" on storage.objects
  for delete using (bucket_id = 'models');
