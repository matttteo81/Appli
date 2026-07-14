-- =====================================================================
-- Fil — Mise à jour "Messagerie"
-- À exécuter UNE FOIS dans Supabase > SQL Editor > Run. Sans risque.
-- =====================================================================

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_couple_idx on public.messages(couple_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists messages_all on public.messages;
create policy messages_all on public.messages
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

do $$ begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null; end;
end $$;
