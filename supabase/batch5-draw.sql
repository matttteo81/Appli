-- =====================================================================
-- Batch 5 : le dessin partagé ✏️
-- =====================================================================
-- Une toile commune : chacun dessine au doigt, et les traits
-- apparaissent en temps réel sur l'écran de l'autre.
--
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

create table if not exists public.drawing_strokes (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  color      text not null,
  width      real not null default 4,
  points     jsonb not null,  -- [[x,y],...] normalisés entre 0 et 1
  created_at timestamptz not null default now()
);

create index if not exists drawing_strokes_couple_idx
  on public.drawing_strokes(couple_id, created_at);

alter table public.drawing_strokes enable row level security;

drop policy if exists drawing_strokes_all on public.drawing_strokes;
create policy drawing_strokes_all on public.drawing_strokes
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

-- Temps réel.
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.drawing_strokes';
  exception when duplicate_object then null; end;
end $$;
