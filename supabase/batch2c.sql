-- =====================================================================
-- Fil — Mise à jour "Jeux à deux"
-- À exécuter UNE FOIS dans Supabase > SQL Editor > Run. Sans risque.
-- =====================================================================

create table if not exists public.game_responses (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  game       text not null,       -- 'qui' | 'know_self' | 'know_guess' | 'q36'
  item_key   text not null,       -- index de la question/prompt
  author_id  uuid not null references public.profiles(id) on delete cascade,
  value      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, game, item_key, author_id)
);
create index if not exists game_responses_idx on public.game_responses(couple_id, game);

alter table public.game_responses enable row level security;

drop policy if exists game_responses_all on public.game_responses;
create policy game_responses_all on public.game_responses
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

do $$ begin
  begin alter publication supabase_realtime add table public.game_responses;
  exception when duplicate_object then null; end;
end $$;
