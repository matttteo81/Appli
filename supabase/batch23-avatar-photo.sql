-- Batch 23 : photo de profil.
--
-- Chaque personne peut choisir une photo de profil. Elle est stockée dans le
-- bucket `photos` (déjà existant) et son chemin est gardé dans `avatar_path`.
-- Cette photo s'affiche en petit sur la carte, à côté de la position de la
-- personne.
--
-- Idempotent : peut être collé plusieurs fois sans risque.

alter table public.profiles
  add column if not exists avatar_path text;

-- Vérification.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name = 'avatar_path';
