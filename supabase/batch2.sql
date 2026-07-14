-- =====================================================================
-- Fil — Mise à jour "Batch 2 · groupe 1"
-- =====================================================================
-- À exécuter UNE FOIS dans : Supabase Dashboard > SQL Editor > Run.
-- Ajoute : comptes à rebours multiples + réponses à la question du jour.
-- Sans risque, relançable.
-- =====================================================================

-- Comptes à rebours (plusieurs par couple)
create table if not exists public.countdowns (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  title      text not null,
  emoji      text not null default '📅',
  date       date not null,
  created_at timestamptz not null default now()
);
create index if not exists countdowns_couple_idx on public.countdowns(couple_id, date);

-- Réponses à la question du jour (une par personne et par jour)
create table if not exists public.daily_answers (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  question_date date not null,
  question_text text not null,
  answer        text not null,
  created_at    timestamptz not null default now(),
  unique (couple_id, author_id, question_date)
);
create index if not exists daily_answers_couple_idx
  on public.daily_answers(couple_id, question_date desc);

-- Sécurité (réservé aux membres du couple)
alter table public.countdowns    enable row level security;
alter table public.daily_answers enable row level security;

drop policy if exists countdowns_all on public.countdowns;
create policy countdowns_all on public.countdowns
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists daily_answers_all on public.daily_answers;
create policy daily_answers_all on public.daily_answers
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

-- Temps réel
do $$
declare t text;
begin
  foreach t in array array['countdowns','daily_answers'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
