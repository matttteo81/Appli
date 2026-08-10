-- Batch 25 : bibliothèque « Mes GIFs » 🎞️
--
-- Quand on importe (ou crée) un GIF, on le garde dans une bibliothèque
-- partagée du couple : plus besoin de le réimporter à chaque fois, il reste
-- dans l'onglet « Mes GIFs ».
--
-- Idempotent : peut être collé plusieurs fois sans risque.

create table if not exists public.saved_gifs (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  url        text not null,
  created_at timestamptz not null default now()
);
create index if not exists saved_gifs_couple_idx on public.saved_gifs(couple_id, created_at desc);

alter table public.saved_gifs enable row level security;
drop policy if exists saved_gifs_all on public.saved_gifs;
create policy saved_gifs_all on public.saved_gifs
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

-- Temps réel (les GIFs sauvegardés apparaissent chez les deux).
alter table public.saved_gifs replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'saved_gifs'
  ) then
    alter publication supabase_realtime add table public.saved_gifs;
  end if;
end $$;
