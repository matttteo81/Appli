-- Batch 22 : position automatique.
--
-- Chaque profil peut activer/désactiver la mise à jour automatique de sa
-- position exacte. Quand c'est activé (par défaut), l'app rafraîchit ta
-- position à l'ouverture / au retour au premier plan : si tu changes de
-- ville, ta position (et donc la distance, la météo, la carte) se met à
-- jour toute seule.
--
-- Idempotent : peut être collé plusieurs fois sans risque.

alter table public.profiles
  add column if not exists auto_location boolean not null default true;

-- Vérification.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name = 'auto_location';
