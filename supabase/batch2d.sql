-- =====================================================================
-- Fil — Mise à jour "Ensemble" (séance synchronisée)
-- À exécuter UNE FOIS dans Supabase > SQL Editor > Run. Sans risque.
-- =====================================================================

create table if not exists public.watch_sessions (
  couple_id    uuid primary key references public.couples(id) on delete cascade,
  title        text,
  is_playing   boolean not null default false,
  base_seconds integer not null default 0,
  base_at      timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.watch_sessions enable row level security;

drop policy if exists watch_sessions_all on public.watch_sessions;
create policy watch_sessions_all on public.watch_sessions
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

do $$ begin
  begin alter publication supabase_realtime add table public.watch_sessions;
  exception when duplicate_object then null; end;
end $$;
