-- =====================================================================
-- Démo : conversation vivante dans la messagerie 💬 (pour la vidéo)
-- =====================================================================
-- Remplit une vraie discussion de couple longue distance (Toulouse ↔
-- Shanghai) entre TON compte et ta/ton partenaire. Les identifiants sont
-- retrouvés automatiquement à partir de ton email.
--
-- À coller dans Supabase → SQL Editor → Run.
-- (Lance-le UNE fois. Pour repartir propre, dé-commente la ligne DELETE.)
-- =====================================================================

with me as (
  select p.id as author_id, p.couple_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower('matttteo81@gmail.com')
  limit 1
),
partner as (
  select p.id as author_id
  from public.profiles p, me
  where p.couple_id = me.couple_id and p.id <> me.author_id
  limit 1
),
-- who : 'me' = toi (Matteo), 'her' = ta moitié (Liu)
convo(who, body, mins_ago) as (
  values
    ('her', 'Bonjour mon cœur 🌅 il est déjà midi ici, toi tu dors encore 😴', 735),
    ('me',  'Coucou toi 🥰 je viens de me réveiller… j''ai encore rêvé de nous', 720),
    ('her', 'Raconte 👀', 715),
    ('me',  'On marchait main dans la main sur une plage, juste tous les deux 🏖️', 710),
    ('her', 'Tu me manques trop 💛', 705),
    ('me',  'Toi aussi tu me manques… vivement qu''on se retrouve 🥹', 700),
    ('her', 'J''ai regardé le compte à rebours ce matin, plus que quelques semaines !', 690),
    ('me',  'Je le regarde tous les jours sur l''accueil 😍 j''y crois à peine', 685),
    ('her', 'T''as nourri l''œuf de la ferme aujourd''hui ? 🥚', 430),
    ('me',  'Ouiii 🐣 je crois qu''il va bientôt éclore, ce sera une poule je parie 🐔', 425),
    ('her', 'On l''appellera comment ? 🥰', 420),
    ('me',  'On décidera ensemble ce soir 💛', 415),
    ('her', 'Il fait quel temps à Toulouse ?', 250),
    ('me',  'Grand soleil ☀️ et toi à Shanghai ?', 246),
    ('her', 'Un peu de pluie 🌧️ mais je pense à toi, ça réchauffe', 242),
    ('me',  'Je t''ai laissé un petit vocal 🎙️ écoute-le avant de dormir', 130),
    ('her', 'Je viens de l''écouter… ta voix me fait fondre 🫠', 120),
    ('me',  'Je t''appelle ce soir ? 📞', 45),
    ('her', 'Ouiii !! 21h pour toi, 3h du matin pour moi mais je m''en fiche 😂❤️', 40),
    ('me',  'Je t''aime tellement 💛', 15),
    ('her', 'Je t''aime encore plus 😘', 12)
)
-- Pour une conversation toute propre, dé-commente la ligne suivante :
-- , cleared as ( delete from public.messages where couple_id = (select couple_id from me) returning 1 )
insert into public.messages (couple_id, author_id, body, created_at)
select me.couple_id,
       case c.who when 'me' then me.author_id else partner.author_id end,
       c.body,
       now() - make_interval(mins => c.mins_ago)
from convo c, me, partner;
