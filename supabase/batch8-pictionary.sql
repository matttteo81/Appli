-- =====================================================================
-- Batch 8 : jeu « Dessine & devine » 🎨
-- =====================================================================
-- Réutilise la toile temps réel (drawing_strokes) avec une colonne
-- « board » pour séparer le dessin libre ('free') du jeu ('game').
--
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

-- Séparer les toiles (dessin libre vs jeu).
alter table public.drawing_strokes
  add column if not exists board text not null default 'free';

-- Une manche de « Dessine & devine » par couple.
create table if not exists public.pictionary (
  couple_id  uuid primary key references public.couples(id) on delete cascade,
  drawer_id  uuid references public.profiles(id) on delete set null,
  word       text,
  solved     boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.pictionary enable row level security;

drop policy if exists pictionary_all on public.pictionary;
create policy pictionary_all on public.pictionary
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.pictionary';
  exception when duplicate_object then null; end;
end $$;
