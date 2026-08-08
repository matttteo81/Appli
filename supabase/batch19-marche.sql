-- =====================================================================
-- Batch 19 : le marchand ambulant 🧺 (pièces + boutique + aliments)
-- =====================================================================
-- • Porte-monnaie partagé : +1 à la connexion (1×/j/personne), +2 en nourrissant.
-- • Jours de marché : 2 jours/semaine, mêmes jours pour les deux (déterministe).
-- • Boutique : acheter l'aliment préféré de chaque espèce.
-- • Donner le plat préféré = requis pour passer ADO → ADULTE, et 2 fois = pelage rare.
--
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

-- Colonnes ajoutées
alter table public.farm add column if not exists coins integer not null default 0;
alter table public.farm add column if not exists active_fav_fed integer not null default 0;
alter table public.farm_residents add column if not exists rare boolean not null default false;

-- Connexions quotidiennes (pour +1 pièce une fois par jour et par personne)
create table if not exists public.farm_logins (
  couple_id  uuid not null references public.couples(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  login_date date not null default current_date,
  primary key (couple_id, user_id, login_date)
);

-- Inventaire d'aliments (partagé par le couple)
create table if not exists public.farm_inventory (
  couple_id uuid not null references public.couples(id) on delete cascade,
  food_id   text not null,
  qty       integer not null default 0,
  primary key (couple_id, food_id)
);

alter table public.farm_logins    enable row level security;
alter table public.farm_inventory enable row level security;
drop policy if exists farm_logins_all on public.farm_logins;
create policy farm_logins_all on public.farm_logins for all to authenticated
  using (couple_id = public.current_couple_id()) with check (couple_id = public.current_couple_id());
drop policy if exists farm_inv_all on public.farm_inventory;
create policy farm_inv_all on public.farm_inventory for all to authenticated
  using (couple_id = public.current_couple_id()) with check (couple_id = public.current_couple_id());

do $$ begin
  begin execute 'alter publication supabase_realtime add table public.farm_inventory';
  exception when duplicate_object then null; end;
end $$;

-- Catalogue : espèce ciblée + prix par aliment
create or replace function public._pf_food_species(p_food text) returns text
language sql immutable set search_path = public as $$
  select case p_food
    when 'grain' then 'hen' when 'carrot' then 'rabbit' when 'bone' then 'dog'
    when 'fish' then 'cat' when 'acorn' then 'pig' else null end;
$$;
create or replace function public._pf_food_price(p_food text) returns integer
language sql immutable set search_path = public as $$
  select case p_food
    when 'bone' then 12 when 'fish' then 12 else 10 end;
$$;

-- Jour de marché ? (2 jours/semaine, déterminés par le couple)
create or replace function public.pf_market_open(p_couple uuid) returns boolean
language plpgsql stable set search_path = public as $$
declare d1 int; d2 int; today int;
begin
  d1 := abs(hashtext(p_couple::text)) % 7;
  d2 := abs(hashtext(p_couple::text || 'salt')) % 7;
  if d2 = d1 then d2 := (d1 + 3) % 7; end if;
  today := extract(dow from current_date)::int;
  return today = d1 or today = d2;
end; $$;

-- +1 pièce à la première connexion du jour.
create or replace function public.pf_daily_login(p_couple uuid)
returns public.farm language plpgsql security definer set search_path = public as $$
declare f public.farm;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  begin
    insert into public.farm_logins (couple_id, user_id) values (p_couple, auth.uid());
    update public.farm set coins = coins + 1 where couple_id = p_couple;
  exception when unique_violation then null; -- déjà connecté aujourd'hui
  end;
  select * into f from public.farm where couple_id = p_couple;
  return f;
end; $$;

-- Passe à l'âge adulte si prêt (30 repas) ET nourri de son plat préféré.
create or replace function public._pf_maybe_grow_up(p_couple uuid)
returns public.farm language plpgsql set search_path = public as $$
declare f public.farm;
begin
  select * into f from public.farm where couple_id = p_couple;
  if f.active_species is not null and f.active_feeds >= 30 and f.active_fav_fed >= 1 then
    insert into public.farm_residents (couple_id, species, name, color, rare, x, y)
      values (p_couple, f.active_species, coalesce(nullif(f.active_name,''), f.active_species),
              f.active_color, f.active_fav_fed >= 2, 0.12 + random()*0.76, 0.25 + random()*0.65);
    update public.farm set active_species = null, active_name = null, active_feeds = 0,
      active_fav_fed = 0, last_grown_at = now() where couple_id = p_couple returning * into f;
  end if;
  return f;
end; $$;

-- Nourrir : 1×/jour/personne, +2 pièces, grandit (bloque à 30 sans plat préféré).
create or replace function public.pf_feed(p_couple uuid)
returns public.farm language plpgsql security definer set search_path = public as $$
declare f public.farm;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  select * into f from public.farm where couple_id = p_couple;
  if f.couple_id is null or f.active_species is null then raise exception 'Aucun animal à nourrir pour le moment.'; end if;
  begin
    insert into public.farm_feeds (couple_id, user_id, feed_date) values (p_couple, auth.uid(), current_date);
  exception when unique_violation then
    raise exception 'Tu l''as déjà nourri aujourd''hui 🌙 Reviens demain !';
  end;
  update public.farm set active_feeds = least(active_feeds + 1, 30), coins = coins + 2
    where couple_id = p_couple;
  return public._pf_maybe_grow_up(p_couple);
end; $$;

-- Acheter un aliment (jour de marché uniquement).
create or replace function public.pf_buy_food(p_couple uuid, p_food text)
returns public.farm language plpgsql security definer set search_path = public as $$
declare f public.farm; price int;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  if public._pf_food_species(p_food) is null then raise exception 'Aliment inconnu.'; end if;
  if not public.pf_market_open(p_couple) then raise exception 'Le marchand n''est pas là aujourd''hui.'; end if;
  price := public._pf_food_price(p_food);
  select * into f from public.farm where couple_id = p_couple;
  if f.coins < price then raise exception 'Pas assez de pièces 🪙'; end if;
  update public.farm set coins = coins - price where couple_id = p_couple returning * into f;
  insert into public.farm_inventory (couple_id, food_id, qty) values (p_couple, p_food, 1)
    on conflict (couple_id, food_id) do update set qty = public.farm_inventory.qty + 1;
  return f;
end; $$;

-- Donner un aliment : régal ; s'il correspond à l'animal en cours, compte pour l'âge adulte.
create or replace function public.pf_give_food(p_couple uuid, p_food text)
returns public.farm language plpgsql security definer set search_path = public as $$
declare f public.farm; sp text; has_match boolean; have_qty int;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  sp := public._pf_food_species(p_food);
  if sp is null then raise exception 'Aliment inconnu.'; end if;
  select qty into have_qty from public.farm_inventory where couple_id = p_couple and food_id = p_food;
  if coalesce(have_qty,0) <= 0 then raise exception 'Tu n''as pas cet aliment.'; end if;
  select * into f from public.farm where couple_id = p_couple;
  has_match := (f.active_species = sp)
    or exists (select 1 from public.farm_residents where couple_id = p_couple and species = sp);
  if not has_match then raise exception 'Aucun animal n''en veut pour le moment.'; end if;
  update public.farm_inventory set qty = qty - 1 where couple_id = p_couple and food_id = p_food;
  delete from public.farm_inventory where couple_id = p_couple and food_id = p_food and qty <= 0;
  if f.active_species = sp then
    update public.farm set active_fav_fed = active_fav_fed + 1 where couple_id = p_couple;
  end if;
  return public._pf_maybe_grow_up(p_couple);
end; $$;

-- pf_new_egg : réinitialise aussi le compteur de plat préféré.
create or replace function public.pf_new_egg(p_couple uuid)
returns public.farm language plpgsql security definer set search_path = public as $$
declare f public.farm;
begin
  if p_couple is distinct from public.current_couple_id() then raise exception 'Pas ton couple.'; end if;
  select * into f from public.farm where couple_id = p_couple;
  if f.active_species is not null then raise exception 'Un animal est déjà en cours d''élevage.'; end if;
  if f.last_grown_at is not null and now() - f.last_grown_at < interval '2 days' then
    raise exception 'Encore un peu de repos avant un nouvel œuf 🥚';
  end if;
  update public.farm set active_species = public._pf_species(p_couple), active_name = null,
    active_feeds = 0, active_fav_fed = 0, active_color = floor(random()*6)::int
    where couple_id = p_couple returning * into f;
  return f;
end; $$;

revoke execute on function public.pf_market_open(uuid)       from anon, public;
revoke execute on function public.pf_daily_login(uuid)       from anon, public;
revoke execute on function public.pf_buy_food(uuid, text)    from anon, public;
revoke execute on function public.pf_give_food(uuid, text)   from anon, public;
grant  execute on function public.pf_market_open(uuid)       to authenticated;
grant  execute on function public.pf_daily_login(uuid)       to authenticated;
grant  execute on function public.pf_buy_food(uuid, text)    to authenticated;
grant  execute on function public.pf_give_food(uuid, text)   to authenticated;
grant  execute on function public.pf_feed(uuid)              to authenticated;
grant  execute on function public.pf_new_egg(uuid)           to authenticated;
