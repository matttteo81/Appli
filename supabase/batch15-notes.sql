-- =====================================================================
-- Batch 15 : notes surprises 💌 (petits mots scellés, programmables)
-- =====================================================================
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

create table if not exists public.love_notes (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  to_id      uuid references public.profiles(id) on delete set null,
  body       text not null,
  reveal_at  timestamptz,              -- null = ouvrable tout de suite
  opened     boolean not null default false,
  opened_at  timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists love_notes_couple_idx on public.love_notes(couple_id, created_at);

alter table public.love_notes enable row level security;
drop policy if exists love_notes_all on public.love_notes;
create policy love_notes_all on public.love_notes
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.love_notes';
  exception when duplicate_object then null; end;
end $$;
