# ✅ Checklist « premier build groupé » — Fil

Tout ce qui s'est accumulé dans le code **depuis le dernier build sur TestFlight**.
Objectif : **1 build → tout tester d'un coup**, méthodiquement, en cochant au fur et à mesure.

> Rappel : coder une fonctionnalité ne coûte pas de build. Seuls **tester sur
> le téléphone** puis **corriger un bug** ou **ajouter du natif** en consomment.

---

## 0. Avant de lancer le build (moi, sans dépenser de build)

- [ ] `npx tsc --noEmit` propre
- [ ] `rm -rf dist && npx expo export --platform ios` propre
- [ ] Relire `app.json` (plugins natifs : expo-audio, expo-location, notifications)
- [ ] Confirmer que **react-native-maps est bien absent** (c'est lui qui faisait
      planter le build #22)
- [ ] Préparer dans le MÊME build le natif restant (widgets + carte Apple) si on
      décide de les inclure — voir section 🔜

---

## 1. 🚀 L'app se lance (le plus critique)

- [ ] L'app s'ouvre sans crash au démarrage
- [ ] On passe l'écran de connexion / appairage
- [ ] L'accueil s'affiche
- [ ] On peut naviguer dans **tous** les onglets sans plantage
- [ ] On ouvre chaque écran de la grille « À deux » sans plantage

---

## 2. 🏠 Accueil (rangé)

- [ ] Ciel jumeau : les 2 fuseaux horaires + météo de chacun
- [ ] Badge série 🔥 « X jours d'affilée »
- [ ] Vos humeurs (choisir la sienne, voir celle du partenaire)
- [ ] Grille « À DEUX » compacte (7 tuiles) bien lisible
- [ ] « Ensemble depuis » (compteur ans/mois/jours + photo)
- [ ] Distance entre vous (km)
- [ ] Comptes à rebours
- [ ] Ligne **« Paramètres »** en bas → ouvre la page dédiée (voir section 13)

---

## 3. 💬 Messagerie

- [ ] Envoyer / recevoir un message en temps réel
- [ ] GIFs prédéfinis (choisir dans la liste)
- [ ] GIF créé depuis ses propres photos
- [ ] Réactions à un message (emoji)
- [ ] Répondre à un message précis (reply)
- [ ] **Traduction** 🈶 : un message dans l'autre langue affiche « 🌐 Traduire » →
      tap → traduction sous le message (MyMemory gratuit). « Masquer » pour cacher.
- [ ] Un message dans TA langue n'affiche PAS le lien (normal)
- [ ] *(Qualité FR↔中文 « correcte » avec MyMemory — voir upgrade Azure plus bas)*

### 💗 Cœur flottant — attentions
- [ ] Tap sur le cœur → choix : « Tu me manques » / « Je pense fort à toi » / 🎙️ vocal
- [ ] Chaque envoi déclenche le popup + la notif chez la moitié
- [ ] Appui long sur le cœur → ouvre directement le vocal

---

## 4. 🐣 Ferme pixel (style Terraria)

- [ ] Le jeu prend tout l'écran
- [ ] Au départ : **1 seul œuf**, terrain vide
- [ ] Nourrir : **1 fois/jour/personne** (donc 2 max/jour à deux)
- [ ] L'œuf éclôt après assez de repas → **on nomme l'animal**
- [ ] Espèce **aléatoire** + **couleur de pelage aléatoire**
- [ ] ~15 jours pour devenir adulte
- [ ] Une fois adulte : l'animal s'installe + sa **niche/maison** apparaît
- [ ] **Nouvel œuf** proposé ~2 jours après
- [ ] Jour/nuit **automatique** selon l'heure locale
- [ ] La nuit : les animaux vont dormir dans leur niche avec les **Zzz**
- [ ] Sprites chat / chien redessinés, nets

### 🌾 Ferme enrichie (NOUVEAU)
- [ ] 🦋 Papillons qui **battent des ailes** et volent en zigzag (le jour, beau temps)
- [ ] 🐦 Oiseaux qui **battent des ailes** en traversant le ciel
- [ ] Météo réelle de ta ville → ferme : 🌧️ **flaques** quand il pleut, ❄️ **neige au sol** + flocons quand il neige
- [ ] 🍂 Quelques **feuilles marron** au sol au printemps
- [ ] ✋ **Toucher un animal** → il saute + un ❤️ s'envole
- [ ] 📅 **Carnet des animaux** (bouton calendrier) : liste chaque animal avec
      prénom, date de naissance et âge (+ l'œuf en cours)
- [ ] Espèces débloquées par la série 🔥 (lapin 7j, chien 30j) et les jours
      ensemble (chat 100j) → SQL `batch18` ; les œufs tirent parmi les débloquées

---

## 5. 🍿 Ciné à deux

- [ ] La section s'appelle bien « Ciné à deux »
- [ ] Lancer une séance, se synchroniser à la seconde entre les 2 téléphones
- [ ] Play / pause partagés

---

## 6. 🎙️ « Tu me manques » (nudge)

- [ ] Envoyer un nudge
- [ ] Enregistrer et joindre un **message vocal**
- [ ] Le partenaire reçoit le popup + peut écouter le vocal

---

## 7. 🗺️ Localisation & souvenirs

- [ ] Choisir sa ville (météo + distance se mettent à jour)
- [ ] Ajouter une photo → sa **position** est captée (EXIF ou position actuelle)
- [ ] Écran « Nos souvenirs par lieu » : photos **regroupées par endroit**

### 🗺️ Vraie carte Apple (NOUVEAU — natif, `expo-maps`)
- [ ] Onglet Carte → bouton **« 🗺️ La vraie carte de nos souvenirs »**
- [ ] La carte Apple s'affiche (nécessite **iOS 17+** sur l'iPhone)
- [ ] Épingle 💛 toi / 💚 ta moitié sur vos villes
- [ ] Épingles 📷 sur les lieux des photos géolocalisées (regroupées par endroit)
- [ ] Toucher une épingle photo → ouvre la liste des souvenirs (iOS 18+)
- [ ] Si la carte ne charge pas : un **repli** propre s'affiche (pas de crash) +
      bouton vers la liste
- [ ] ⚠️ Vérifier que l'app **démarre toujours normalement** (la carte est
      chargée à la demande, isolée derrière une barrière anti-plantage)

---

## 8. 🎵 Playlist

- [ ] Ajouter un morceau
- [ ] Liens **QQ Music** + **NetEase** présents (pour la partenaire en Chine)

---

## 9. 📔 Journal des souvenirs

- [ ] Frise datée (date + titre + texte + photo)
- [ ] Ajouter un souvenir avec le sélecteur de date
- [ ] Supprimer un de ses souvenirs (appui long)

---

## 10. ✨ Les 5 nouveautés de la dernière session

### 🔥 Série (streak)
- [ ] Le compteur augmente à l'ouverture quotidienne
- [ ] Ne double pas si on ouvre 2 fois le même jour

### ✅ À faire ensemble (bucket-list)
- [ ] Ajouter un rêve
- [ ] Cocher / décocher (voir qui a coché)
- [ ] Supprimer (appui long)
- [ ] Les « faits » passent en bas

### 💌 Petits mots (notes surprises)
- [ ] Écrire un mot **ouvrable tout de suite**
- [ ] Écrire un mot **programmé** pour une date → enveloppe 🔒 verrouillée
- [ ] Le partenaire ouvre l'enveloppe le jour venu (animation)
- [ ] Côté expéditeur : statut (pas ouverte / ouverte le…)
- [ ] La **notification** de rappel arrive (autoriser les notifs)

### 📅 Agenda partagé
- [ ] Calendrier mensuel, navigation ‹ ›
- [ ] Pastilles sur les jours qui ont un événement
- [ ] Ajouter un événement (type, titre, date, heure option., note)
- [ ] Liste « Prochainement »
- [ ] **Rappel local** reçu à l'heure de l'événement (autoriser les notifs)

### 💞 Langages de l'amour
- [ ] Répondre aux 15 questions
- [ ] Voir son profil (5 barres en %) + langage principal
- [ ] Quand le partenaire a fini : les 2 profils côte à côte + conseil
- [ ] « Refaire le test »

---

## 13. ⚙️ Page Paramètres + préparation publication (NOUVEAU)

> SQL à coller : `supabase/batch17-delete-account.sql`

- [ ] Accueil → **Paramètres** ouvre la nouvelle page
- [ ] **Photos** : changer la photo d'accueil + la photo « Ensemble depuis »
      (l'accueil se met bien à jour après)
- [ ] Ligne « Photo du widget » grisée « Bientôt » (normal)
- [ ] **Face ID** : le verrou fonctionne toujours (déplacé ici)
- [ ] **Politique de confidentialité** : la page s'ouvre et se lit
- [ ] **Se déconnecter** fonctionne
- [ ] **Supprimer mon compte** : double confirmation → compte + données effacés →
      retour à l'écran de connexion. ⚠️ (obligatoire App Store)
- [ ] Après suppression : le **partenaire garde son compte** (vérifier à 2 tel.)
- [ ] Contact de la politique : `support.application1@gmail.com` ✅
- [x] **URL publique** de la politique (pour les stores) :
      https://classy-lollipop-8f7a84.netlify.app ✅

## 11. ⚠️ Points de vigilance

- [ ] **Autoriser les notifications** au 1er lancement (sinon rappels agenda/notes
      silencieux)
- [ ] Vérifier que les **rappels locaux** ne se dupliquent pas (on annule + reprogramme
      à chaque ouverture de l'agenda)
- [ ] Fuseaux horaires : Chine (partenaire) vs France — vérifier heures/jour-nuit
- [ ] Realtime : tester à 2 téléphones que tout se synchronise bien

---

## ⚙️ Nouveautés natives incluses dans CE build (à surveiller au build)

- [x] **Vraie carte Apple** (`expo-maps`) — préparée, chargée à la demande +
      barrière anti-plantage
- [x] **iOS 17.0** comme cible minimale (`expo-build-properties`) — requis par
      Apple Maps. ⚠️ l'app ne s'installera plus sur iOS 15/16.
- [x] **Widgets iOS** (`@bacons/apple-targets`) — 2 widgets texte préparés
      (voir section 12).

## 12. 📱 Widgets iOS (NOUVEAU — natif)

### ⚠️ Prérequis AVANT de lancer le build (sinon le build peut échouer)
- [ ] **Team ID Apple** : ajouter `ios.appleTeamId` dans `app.json` (10 caractères,
      visible sur la page « Membership » du compte développeur de ton ami). Sans lui,
      la signature du widget peut faire échouer le build.
- [ ] **App Group** : à la 1re compilation, EAS doit enregistrer
      `group.com.fil.couple.widgets` sur le compte Apple (normalement automatique
      avec les identifiants gérés par EAS — à surveiller).

### À tester une fois installé
- [ ] Ajouter un widget depuis l'écran d'accueil iPhone → chercher **« Fil »**
- [ ] Widget **Compte à rebours** : affiche les jours avant les retrouvailles
- [ ] Widget **Jours ensemble** : affiche les jours + la série 🔥
- [ ] Les valeurs se **mettent à jour** après avoir ouvert l'app (réglé une date,
      ouvert Fil) — pas instantané, c'est normal (budget iOS)
- [ ] Le compteur **change tout seul** le lendemain (timeline quotidienne)
- [ ] Tailles petite + moyenne OK
- [ ] ⚠️ Si un widget reste gris/vide : ce n'est **jamais** un plantage de l'app
      (widget = processus séparé)

## 🔜 À faire APRÈS ce build

- [ ] Connecter la **partenaire (Chine)** à TestFlight
- [ ] **Widget photo** façon Locket (sur la tuyauterie App Group déjà en place)
- [ ] (Éventuel) épingles photo avec **vraie vignette** au lieu de l'icône 📷

## 🈶 Upgrade traduction vers Azure (meilleure qualité, gratuit 2 M car./mois)

Quand tu veux passer de MyMemory à Azure :
1. Créer un compte **Azure** → ressource **Translator** tier **Free F0** → récupérer
   la **clé** + la **région** (ex. `westeurope`).
2. Déployer la fonction `supabase/functions/translate/` sur Supabase.
3. Définir les secrets `AZURE_TRANSLATOR_KEY` et `AZURE_TRANSLATOR_REGION`.
4. Dans `src/lib/translate.ts`, passer `USE_EDGE_FN` à `true`.
   → bascule automatique, la clé reste côté serveur (jamais dans l'app).

---

## 🧮 Stratégie build (économie de quota)

1. Tout le JS/TS est déjà empilé → **1 build compile tout**.
2. On garde une **réserve** de builds pour les corrections post-test.
3. On ne rebuild que pour : un **bug réel** trouvé au test, ou un **ajout natif**.
4. Idéalement : 1 gros build « fonctionnalités » + 1 build « natif » (widgets/carte)
   + quelques builds de rattrapage. **Jamais 1 nouveauté = 1 build.**
