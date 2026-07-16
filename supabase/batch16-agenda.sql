-- =====================================================================
-- Batch 16 : agenda partagé 📅 (événements datés + rappels locaux)
-- =====================================================================
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  title      text not null,
  emoji      text not null default '📅',
  event_date date not null,
  event_time text,                     -- 'HH:MM' ou null (toute la journée)
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists events_couple_idx on public.events(couple_id, event_date);

alter table public.events enable row level security;
drop policy if exists events_all on public.events;
create policy events_all on public.events
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.events';
  exception when duplicate_object then null; end;
end $$;
