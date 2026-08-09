-- Batch 21 : géolocalisation des souvenirs du Journal.
--
-- On ajoute la position (lat/lng) à la table `memories`. Elle est renseignée
-- automatiquement depuis les métadonnées EXIF de la photo attachée au souvenir
-- (comme pour l'album). Les souvenirs géolocalisés apparaîtront comme des
-- épingles 📔 sur « Notre carte ».
--
-- Idempotent : peut être collé plusieurs fois sans risque.

alter table public.memories
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Vérification.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'memories'
  and column_name in ('lat', 'lng')
order by column_name;
