-- Batch 24 : série « à deux » 🔥
--
-- Avant, la série montait dès que N'IMPORTE qui ouvrait Fil. Désormais elle
-- ne compte que les jours où les DEUX partenaires sont venus. On garde une
-- trace de présence par personne et par jour, et on n'incrémente le compteur
-- que lorsque les deux sont présents le même jour.
--
-- Idempotent : peut être collé plusieurs fois sans risque.

-- Présence quotidienne, une ligne par (couple, personne, jour).
create table if not exists public.couple_presence (
  couple_id  uuid not null references public.couples(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day        date not null default current_date,
  primary key (couple_id, profile_id, day)
);

alter table public.couple_presence enable row level security;
drop policy if exists couple_presence_all on public.couple_presence;
create policy couple_presence_all on public.couple_presence
  for all to authenticated
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

create or replace function public.touch_streak(p_couple uuid)
returns public.couples
language plpgsql security definer set search_path = public as $$
declare
  c public.couples;
  members int;
  present_today int;
begin
  -- 1) Note la présence du jour de la personne qui appelle.
  insert into public.couple_presence (couple_id, profile_id, day)
  values (p_couple, auth.uid(), current_date)
  on conflict do nothing;

  select * into c from public.couples where id = p_couple;

  -- 2) Nombre de membres du couple, et nombre présents aujourd'hui.
  select count(*) into members
    from public.profiles where couple_id = p_couple;
  select count(*) into present_today
    from public.couple_presence
    where couple_id = p_couple and day = current_date;

  -- 3) On n'incrémente que si les DEUX sont là aujourd'hui (et pas déjà fait).
  if members >= 2 and present_today >= 2
     and (c.streak_last is null or c.streak_last < current_date) then
    update public.couples
      set streak_count = case when c.streak_last = current_date - 1 then c.streak_count + 1 else 1 end,
          streak_last  = current_date
    where id = p_couple returning * into c;
  end if;

  return c;
end $$;

revoke execute on function public.touch_streak(uuid) from anon, public;
grant  execute on function public.touch_streak(uuid) to authenticated;
