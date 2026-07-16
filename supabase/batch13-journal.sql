-- =====================================================================
-- Batch 13 : le journal des souvenirs 📔
-- =====================================================================
-- Une frise de moments datés (titre, texte, photo) que vous remplissez
-- à deux. À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

create table if not exists public.memories (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  title       text,
  body        text,
  photo_path  text,               -- optionnel (bucket "photos")
  memory_date date not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists memories_couple_idx
  on public.memories(couple_id, memory_date desc);

alter table public.memories enable row level security;

drop policy if exists memories_all on public.memories;
create policy memories_all on public.memories
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.memories';
  exception when duplicate_object then null; end;
end $$;
