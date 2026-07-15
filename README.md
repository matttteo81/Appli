# Fil 🧵💛

**Fil** est une application mobile pour les couples à distance. Deux comptes,
reliés par un code d'invitation, partagent en temps réel : un « ciel jumeau »
(l'heure et le moment de la journée de chacun), la distance qui vous sépare, un
compte à rebours des retrouvailles, des petits mots, des rituels à cocher, un
oiseau virtuel à faire grandir ensemble, un album photo, une playlist, et un
bouton cœur « Tu me manques » qui envoie une vraie notification à l'autre.

Ce guide est écrit pour **débuter de zéro**. Suis les étapes dans l'ordre, une à
la fois. 🙂

---

## 🧰 Ce dont tu as besoin (une seule fois)

1. **Node.js** (version 20 ou plus) installé sur ton ordinateur.
   Vérifie en tapant dans un terminal : `node --version`.
   Si ce n'est pas installé : https://nodejs.org (prends la version « LTS »).
2. **L'app Expo Go** sur ton téléphone (gratuite) :
   - iPhone → App Store, cherche « Expo Go »
   - Android → Play Store, cherche « Expo Go »
3. Un **compte Supabase** gratuit (on le crée à l'étape 2).

> 💡 Tu **n'as pas besoin de Mac** pour tester ni même pour publier sur l'App
> Store (on utilisera EAS, qui compile dans le cloud).

---

## 📥 Étape 1 — Récupérer le projet et installer les librairies

Ouvre un terminal, puis :

```bash
# 1. Récupère le projet depuis GitHub (remplace l'URL si besoin)
git clone https://github.com/matttteo81/appli.git
cd appli

# 2. Installe toutes les librairies (peut prendre 1–2 minutes)
npm install
```

`npm install` télécharge tout le code dont l'app a besoin dans un dossier
`node_modules` (tu n'as jamais à y toucher).

---

## 🗄️ Étape 2 — Créer le backend Supabase

Supabase stocke les données partagées entre vous deux et gère les comptes.

1. Va sur **https://supabase.com** → « Start your project » → crée un compte.
2. Clique **« New project »**. Donne-lui un nom (ex. `fil`), choisis une région
   proche de vous, et **note bien le mot de passe** de la base (tu peux le
   ranger, on n'en a pas besoin dans l'app). Attends ~2 minutes que le projet se
   crée.
3. Dans le menu de gauche, ouvre **« SQL Editor »** → **« New query »**.
4. Ouvre le fichier **`supabase/migrations/0001_init.sql`** de ce projet, copie
   **tout** son contenu, colle-le dans l'éditeur SQL, puis clique **« Run »**.
   → Ça crée toutes les tables, la sécurité, le temps réel et le stockage des
   photos. Tu peux le relancer sans risque.
5. **Désactive la confirmation par email** (pour tester facilement) :
   menu **Authentication → Sign In / Providers → Email**, et **décoche
   « Confirm email »**, puis « Save ». (Tu pourras le réactiver plus tard.)

C'est tout pour Supabase ✅

---

## 🔑 Étape 3 — Brancher tes clés dans l'app

1. Dans Supabase : menu **Settings (roue crantée) → API**. Tu y trouves :
   - **Project URL**
   - **Project API keys → `anon` `public`**
2. Dans le dossier du projet, **copie** le fichier `.env.example` en `.env` :

   ```bash
   cp .env.example .env
   ```

3. Ouvre `.env` et colle tes valeurs :

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://tonprojet.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=ta-cle-anon-public
   ```

> Ces clés « anon/public » sont faites pour être dans l'app, ce ne sont pas des
> secrets. La sécurité vient des règles (RLS) posées par le SQL. Le fichier
> `.env` n'est volontairement **pas** envoyé sur GitHub.

---

## ▶️ Étape 4 — Lancer l'app sur ton téléphone

Dans le terminal, à la racine du projet :

```bash
npx expo start
```

Un **QR code** apparaît. Ensuite :

- **iPhone** : ouvre l'app **Appareil photo**, vise le QR code, tape la
  notification « Ouvrir dans Expo Go ».
- **Android** : ouvre **Expo Go**, « Scan QR code », vise le QR code.

L'app se charge sur ton téléphone. Crée un compte, et te voilà ! 🎉

### Tester à deux

- Sur le **premier téléphone** : crée un compte → « Créer notre fil » → un
  **code à 6 caractères** s'affiche.
- Sur le **deuxième téléphone** (ou un deuxième compte) : crée un compte →
  « Rejoindre avec un code » → saisis le code. Vous êtes reliés, tout se
  synchronise en temps réel.

---

## ⚠️ Deux limites d'Expo Go (et comment les lever)

Expo Go est parfait pour tester vite, mais **deux fonctionnalités ont besoin
d'un « development build »** (une version un peu plus complète de l'app) :

1. **Les vraies notifications push** « Tu me manques » quand l'app est fermée.
   *(Dans Expo Go, le popup en temps réel s'affiche quand même si l'app est
   ouverte.)*
2. **La carte interactive** (`react-native-maps`).
   *(Dans Expo Go, un joli repli s'affiche ; le choix des villes et la distance
   fonctionnent déjà.)*

### Créer un « development build » (gratuit, dans le cloud, sans Mac)

```bash
# 1. Installe l'outil EAS et connecte-toi (crée un compte Expo gratuit)
npm install -g eas-cli
eas login

# 2. Prépare le projet (crée un identifiant de projet EAS)
eas init

# 3. Compile une version de développement pour iPhone
eas build --profile development --platform ios
```

EAS te guide (identifiants Apple, etc.) et compile dans le cloud. À la fin, tu
installes l'app obtenue sur ton téléphone, puis tu lances `npx expo start
--dev-client`. Toutes les fonctions marchent alors, carte et notifications
comprises.

---

## 🍎 Publier sur l'App Store (résumé des grandes étapes)

1. **Compte développeur Apple** : inscris-toi sur
   https://developer.apple.com/programs/ (99 $/an). C'est obligatoire pour
   mettre une app sur l'App Store.
2. **Compiler la version de production** :
   ```bash
   eas build --profile production --platform ios
   ```
3. **Envoyer à Apple (TestFlight)** :
   ```bash
   eas submit --platform ios
   ```
   L'app arrive dans **TestFlight** (via App Store Connect) : tu peux l'essayer
   toi-même et inviter ton amour à la tester avant tout le monde.
4. **Fiche App Store** : sur https://appstoreconnect.apple.com, remplis le nom,
   la description, les captures d'écran, la politique de confidentialité, puis
   soumets pour **relecture Apple** (compte quelques jours). Une fois validée,
   elle est en ligne 🎉

> On pourra faire cette partie ensemble, étape par étape, quand l'app te plaira.

---

## 🗂️ Comment le projet est organisé

```
src/
  app/                 ← les écrans (la navigation suit les fichiers)
    (auth)/            ← connexion / inscription
    pair.tsx           ← relier les deux comptes (code d'invitation)
    (app)/             ← l'app une fois en couple (onglets)
      accueil.tsx      ← ciel jumeau + distance + compte à rebours
      mots.tsx         ← petits mots partagés
      album.tsx        ← album photo
      carte.tsx        ← carte + choix des villes
      adeux/           ← rituels, oiseau, playlist
  components/          ← briques d'interface réutilisables (+ bouton cœur)
  features/            ← morceaux d'écran (ciel jumeau, compte à rebours)
  lib/                 ← outils (Supabase, distance, villes, heures, push…)
  store/               ← état global (session, couple) avec Zustand
  types/               ← description TypeScript de la base
  constants/theme.ts   ← couleurs, espacements, polices
supabase/
  migrations/0001_init.sql  ← TOUT le backend (à exécuter une fois)
```

---

## 🆘 Dépannage rapide

- **Écran « Presque prêt 🌙 »** → ton fichier `.env` manque ou est mal rempli
  (revois l'étape 3), puis relance `npx expo start`.
- **« Connexion impossible » à l'inscription** → vérifie que tu as bien exécuté
  le SQL (étape 2.4) et décoché « Confirm email » (étape 2.5).
- **Rien ne se synchronise entre les deux téléphones** → assure-toi que les deux
  comptes sont bien reliés (même code) et que le SQL a été exécuté en entier.
- **La carte ne s'affiche pas dans Expo Go** → c'est normal (voir la section
  « limites »). Fais un development build pour l'activer.
- **Changer quelque chose et voir le résultat** → modifie un fichier, sauvegarde,
  l'app se recharge toute seule sur le téléphone.

Bon voyage à deux 💛
