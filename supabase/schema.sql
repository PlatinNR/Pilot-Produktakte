-- ============================================================
-- Digitale Produktakte – Supabase Schema
-- Eine Prozesskette wird als ein JSON-Dokument gespeichert.
-- In der Supabase-Konsole unter "SQL Editor" ausführen.
-- ============================================================

create table if not exists public.chains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.chains enable row level security;

-- Lesen: erlaubt für alle (auch anonyme Gäste)
create policy "chains_select" on public.chains
  for select using (true);

-- Schreiben: nur angemeldete Nutzer (Admin)
create policy "chains_insert" on public.chains
  for insert with check (auth.role() = 'authenticated');

create policy "chains_update" on public.chains
  for update using (auth.role() = 'authenticated');

create policy "chains_delete" on public.chains
  for delete using (auth.role() = 'authenticated');

-- updated_at automatisch aktualisieren
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists chains_set_updated_at on public.chains;
create trigger chains_set_updated_at
  before update on public.chains
  for each row execute function public.set_updated_at();

-- ============================================================
-- Admin-Konto anlegen (in der Supabase-Konsole unter
-- Authentication → Users → "Add user" → "Create new user"):
--   Email:   admin@zollern.de
--   Password: <dein Admin-Passwort>
-- ODER per API/SQL nicht empfohlen. Danach kann sich das Tool
-- mit Benutzername "admin" + Passwort anmelden.
-- ============================================================
