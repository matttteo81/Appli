# Fil 💛 — l'appli des couples à distance

**Fil** relie deux partenaires éloignés : ciel jumeau, mots partagés, rituels à
deux, oiseau virtuel à faire grandir ensemble, album photo, carte, playlist, et
le bouton **« Tu me manques »** qui envoie une vraie notification.

Construit avec **Expo (React Native) + TypeScript** et **Supabase** (base de
données partagée en temps réel + comptes).

> 👋 Tu débutes ? Ce guide t'accompagne pas à pas. Suis les sections **dans
> l'ordre**. Chaque commande est expliquée simplement.

---

## 🧭 Vue d'ensemble (ce que tu vas faire)

1. Installer les outils sur ton ordinateur (Node.js)
2. Récupérer ce projet et installer ses librairies
3. Créer ta base de données Supabase (copier-coller un script)
4. Brancher l'appli sur Supabase (fichier `.env`)
5. Tester l'appli sur ton téléphone
6. (Plus tard) La publier sur l'App Store

---

## 1. Installer les outils

Tu as besoin de **Node.js** (le moteur qui fait tourner le projet).

- Va sur https://nodejs.org et installe la version **LTS**.
- Vérifie que c'est bon en tapant dans un terminal :
  ```bash
  node --version
  ```
  Un numéro (ex. `v22.x`) doit s'afficher.

Tu n'as **pas besoin d'un Mac** pour développer : les builds iOS se font dans le
cloud avec EAS (voir plus bas).

---

## 2. Récupérer le projet et installer les librairies

Dans un terminal, place-toi dans le dossier du projet, puis :

```bash
npm install --legacy-peer-deps
```

> `npm install` télécharge toutes les librairies dont l'appli a besoin (elles se
> rangent dans le dossier `node_modules`). L'option `--legacy-peer-deps` évite
> quelques faux conflits de versions sans impact.

---

## 3. Créer la base de données Supabase

La base de données est ce qui permet aux **deux téléphones de voir les mêmes
données en temps réel**.

1. Va sur https://supabase.com et connecte-toi (compte gratuit).
2. Clique **New project**. Donne un nom (ex. `fil`), choisis une région proche
   (ex. `West EU (Paris)`) et un mot de passe de base de données (garde-le).
3. Attends ~2 minutes que le projet soit prêt.
4. Dans le menu de gauche, ouvre **SQL Editor** → **New query**.
5. Ouvre le fichier [`supabase/schema.sql`](./supabase/schema.sql) de ce projet,
   **copie tout son contenu**, colle-le dans l'éditeur, puis clique **Run**.
   Cela crée toutes les tables, la sécurité, le temps réel et le stockage des
   photos. (Tu peux relancer ce script sans risque.)

### Activer les comptes par e-mail

Menu **Authentication → Providers → Email** : vérifie qu'il est **activé**.

> 💡 Astuce pour tester à deux plus vite : dans **Authentication → Providers →
> Email**, tu peux **désactiver "Confirm email"** pendant le développement. Ainsi
> tu peux créer un compte et te connecter tout de suite, sans cliquer sur un lien
> de confirmation. (Tu pourras le réactiver avant la mise en production.)

---

## 4. Brancher l'appli sur Supabase

1. Dans Supabase : **Project Settings** (roue crantée) → **API**.
2. Copie deux valeurs :
   - **Project URL** (ex. `https://abcd1234.supabase.co`)
   - **anon public** (une longue clé qui commence par `eyJ...`)
3. À la racine du projet, **duplique** le fichier `.env.example` et renomme la
   copie en `.env`. Remplis-le :

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

> ⚠️ Le fichier `.env` contient tes clés : il n'est **pas** envoyé sur GitHub
> (il est ignoré volontairement). La clé « anon » est faite pour être dans une
> appli publique — c'est la sécurité de la base (RLS) qui protège les données.

---

## 5. Tester l'appli sur ton téléphone

Deux fonctionnalités (la **carte** et les **vraies notifications push**)
nécessitent un **development build** (une version personnalisée de l'appli). Mais
tu peux déjà tout le reste dans **Expo Go**.

### Option A — Aperçu rapide dans Expo Go (recommandé pour commencer)

1. Installe l'appli **Expo Go** sur ton iPhone (App Store).
2. Sur ton ordinateur, lance :
   ```bash
   npx expo start
   ```
3. Un **QR code** s'affiche. Scanne-le avec l'appareil photo de l'iPhone → l'appli
   s'ouvre dans Expo Go.

> Dans Expo Go : la connexion, les mots, rituels, oiseau, album, playlist et le
> compte à rebours fonctionnent. La **carte** et les **notifications push** ne
> s'afficheront pleinement qu'avec le development build (option B).

### Option B — Development build (carte + notifications + App Store)

C'est la version complète. Elle se construit dans le cloud avec **EAS** (le
service de build d'Expo, gratuit pour commencer).

1. Crée un compte Expo (gratuit) : https://expo.dev
2. Installe l'outil EAS et connecte-toi :
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. Relie le projet à ton compte (crée l'identifiant de projet) :
   ```bash
   eas init
   ```
   > Cela remplit automatiquement `extra.eas.projectId` dans `app.json`. Ce
   > `projectId` est **nécessaire aux notifications push**.
4. Lance un build de développement pour iOS :
   ```bash
   eas build --profile development --platform ios
   ```
   - Suis les instructions (connexion à ton compte Apple, voir §6).
   - À la fin, EAS te donne un lien pour **installer l'appli sur ton iPhone**.
5. Une fois l'appli installée, lance le serveur :
   ```bash
   npx expo start --dev-client
   ```
   et ouvre l'appli depuis ton téléphone.

---

## 6. Envoyer les notifications « Tu me manques »

La notification est envoyée par une petite fonction serveur (**Edge Function**)
déjà écrite dans [`supabase/functions/send-nudge`](./supabase/functions/send-nudge).

Pour la déployer (une seule fois) :

```bash
npm install -g supabase        # l'outil en ligne de commande Supabase
supabase login
supabase link --project-ref TON_REF_DE_PROJET   # visible dans l'URL du dashboard
supabase functions deploy send-nudge
```

> `TON_REF_DE_PROJET` est la partie `abcd1234` de ton URL Supabase.

Une fois déployée, quand un partenaire appuie sur le cœur ❤️, l'autre reçoit une
vraie notification (même app fermée), et un popup plein écran s'affiche avec le
message lu à voix haute.

> ℹ️ Les notifications push ne fonctionnent que sur un **vrai téléphone** avec le
> **development build** (pas dans Expo Go, pas sur simulateur).

---

## 7. Tester à deux

1. Crée un premier compte, choisis **« Créer notre couple »** → un **code** à 6
   lettres s'affiche sur l'accueil.
2. Sur un deuxième téléphone (ou avec l'appli Expo Go d'un(e) ami(e)), crée un
   autre compte et choisis **« J'ai un code »**, saisis le code.
3. Vous êtes reliés ! Tout ce que l'un ajoute apparaît chez l'autre en direct.

---

## 8. Publier sur l'App Store (résumé des étapes)

Quand l'appli te convient :

1. **Compte développeur Apple** : inscris-toi sur
   https://developer.apple.com/programs (99 $/an). C'est obligatoire pour
   publier.
2. **Build de production** :
   ```bash
   eas build --profile production --platform ios
   ```
3. **Envoi sur TestFlight / App Store** :
   ```bash
   eas submit --profile production --platform ios
   ```
   EAS envoie l'appli sur **App Store Connect**.
4. Sur https://appstoreconnect.apple.com :
   - Ajoute une **description**, des **captures d'écran**, une **icône**, la
     politique de confidentialité, etc.
   - Teste d'abord via **TestFlight** (invite-toi + ta moitié).
   - Puis soumets pour **révision Apple**. Sous quelques jours, l'appli est en
     ligne. 🎉

Documentation officielle (en anglais, très illustrée) :
- Builds : https://docs.expo.dev/build/setup/
- Soumission : https://docs.expo.dev/submit/ios/

---

## 🗂️ Structure du projet

```
app/                     ← les écrans (navigation "file-based" d'Expo Router)
  _layout.tsx            ← racine : polices, connexion, notifications, navigation
  index.tsx              ← écran d'entrée (redirige)
  (auth)/                ← connexion / inscription
  pair.tsx               ← relier les deux partenaires (code d'invitation)
  (tabs)/                ← les 7 onglets
    index.tsx            ← Accueil (ciel jumeau, distance, compte à rebours)
    words.tsx            ← Mots partagés
    rituals.tsx          ← Rituels à deux
    pet.tsx              ← Oiseau virtuel
    album.tsx            ← Album photo
    map.tsx              ← Carte
    playlist.tsx         ← Playlist
  nudge.tsx              ← Popup "Tu me manques" (voix)
src/
  components/            ← briques d'interface réutilisables
  lib/                   ← Supabase, notifications, villes, géo, oiseau
  store/auth.ts          ← état de connexion + couple (Zustand)
  hooks/                 ← chargement temps réel des données
  theme/                 ← couleurs et polices
  types/db.ts            ← types de la base de données
supabase/
  schema.sql             ← à exécuter dans Supabase (tables + sécurité)
  functions/send-nudge/  ← fonction d'envoi des notifications push
```

---

## ❓ Problèmes fréquents

- **« Presque prêt 🌙 » s'affiche au lancement** → ton fichier `.env` est vide ou
  mal rempli. Vérifie les deux lignes puis relance (`r` dans le terminal Expo).
- **Je ne reçois pas les notifications** → normal dans Expo Go / sur simulateur.
  Il faut le development build (§5B) + la fonction déployée (§6) + avoir fait
  `eas init`.
- **La carte est vide** → normal dans Expo Go. Elle apparaît dans le development
  build. Pense à choisir ta ville (onglet Carte).
- **Erreur de connexion** → vérifie que l'e-mail est confirmé, ou désactive la
  confirmation d'e-mail dans Supabase pendant les tests (§3).

---

Bon voyage avec **Fil** 💛
