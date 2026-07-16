-- =====================================================================
-- Batch 14 : série (streak) 🔥 + liste « à faire ensemble » ✅
-- =====================================================================
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

-- --- Série de jours consécutifs ---
alter table public.couples add column if not exists streak_count integer not null default 0;
alter table public.couples add column if not exists streak_last date;

-- Marque une activité du jour et met à jour la série. Appelée à l'ouverture.
create or replace function public.touch_streak(p_couple uuid)
returns public.couples
language plpgsql security definer set search_path = public as $$
declare c public.couples;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  select * into c from public.couples where id = p_couple;
  if c.streak_last is null or c.streak_last < current_date then
    update public.couples
      set streak_count = case when c.streak_last = current_date - 1 then c.streak_count + 1 else 1 end,
          streak_last = current_date
      where id = p_couple
      returning * into c;
  end if;
  return c;
end; $$;

revoke execute on function public.touch_streak(uuid) from anon, public;
grant  execute on function public.touch_streak(uuid) to authenticated;

-- --- Liste « à faire ensemble » ---
create table if not exists public.wishes (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  text       text not null,
  done       boolean not null default false,
  done_by    uuid references public.profiles(id) on delete set null,
  done_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists wishes_couple_idx on public.wishes(couple_id, done, created_at);

alter table public.wishes enable row level security;
drop policy if exists wishes_all on public.wishes;
create policy wishes_all on public.wishes
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.wishes';
  exception when duplicate_object then null; end;
end $$;
