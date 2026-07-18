# Lingo — échange linguistique 🌍

Application mobile (Expo / React Native) pour **apprendre les langues entre vrais partenaires**.
Ce n'est **pas** un site de rencontre : tout tourne autour de la pratique des langues.

## Les 3 piliers

| Onglet | Ce qu'on y fait |
|--------|-----------------|
| 🧭 **Découvrir** | Trouver des partenaires **près de soi** (géolocalisation), filtrés par langue. Un badge « Tandem idéal » signale les partenaires complémentaires (ils parlent ce que tu apprends, ils apprennent ce que tu parles). |
| 💬 **Discussions** | Fil de conversations 1-à-1 : **texte, messages vocaux, traduction** à la demande et **corrections** (appui long sur un message reçu). |
| 🎙️ **Salons** | Sessions vocales **en direct** pour pratiquer à l'oral. Scène (hôte + intervenants) / auditoire, présence temps réel. |

Un 4ᵉ onglet **Profil** gère les langues, le niveau, la bio, les centres d'intérêt et le compte.

## Stack technique

- **Expo SDK 57** + **expo-router** (navigation par fichiers)
- **Supabase** : auth e-mail, base Postgres (RLS), Realtime, Storage
- **Zustand** pour l'état global (`src/store/auth.ts`)
- Thème maison : `src/theme/` · composants UI : `src/components/ui.tsx`

## Arborescence

```
app/
  _layout.tsx            Chargement polices + redirection (auth → onboarding → onglets)
  onboarding.tsx         Choix des langues au 1er lancement
  (auth)/                Connexion / inscription
  (tabs)/
    index.tsx            🧭 Découvrir (géoloc + partenaires)
    chats.tsx            💬 Liste des discussions
    rooms.tsx            🎙️ Liste + création de salons
    profile.tsx          👤 Profil + compte
  chat/[id].tsx          Fil de conversation (texte/vocal/traduction/correction)
  room/[id].tsx          Salon vocal (présence temps réel)
  partner/[id].tsx       Profil public d'un partenaire → démarrer une discussion
src/
  lib/languages.ts       Langues, niveaux, score « tandem », intérêts
  lib/translate.ts       Appel de l'Edge Function de traduction
  hooks/useVoiceMessage  Enregistrement + upload des messages vocaux
  types/db.ts            Types de la base (miroir du schéma SQL)
supabase/
  hellotalk/schema.sql   👉 Schéma complet à exécuter dans Supabase
  functions/translate/   Edge Function de traduction (DeepL/Google, à déployer)
```

## Mise en route

### 1. Installer les dépendances
```bash
npm install
```

### 2. Créer le projet Supabase et la base
1. Crée un projet sur [supabase.com](https://supabase.com).
2. Ouvre **SQL Editor** et exécute le contenu de `supabase/hellotalk/schema.sql`
   (tables, RLS, RPC `discover_partners` / `get_or_create_conversation`, buckets Storage, Realtime).

### 3. Configurer les clés
```bash
cp .env.example .env
```
Renseigne `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`
(Dashboard → Project Settings → API).

### 4. Lancer
```bash
npm start        # puis « i » (iOS), « a » (Android) ou QR code Expo Go
```

## Fonctions optionnelles à brancher

### 🌐 Traduction des messages — ✅ déjà en place
L'Edge Function `translate` est **déployée et fonctionnelle** sur le projet Supabase.
Dans le chat, chaque message affiche l'**original** + un bouton **🌐 Traduire** (la
traduction s'affiche à la demande, sous l'original, pour favoriser l'apprentissage).

Moteur actuel : **gratuit** (aucune clé requise).

> **📌 RAPPEL — passer à DeepL (meilleure qualité) quand la clé sera dispo :**
> ```bash
> supabase secrets set DEEPL_API_KEY=xxxx   # clé DeepL (offre gratuite dispo)
> ```
> Aucun changement de code : la fonction bascule automatiquement sur DeepL dès que
> le secret est présent, sinon elle reste sur le moteur gratuit.

### 🔊 Audio en direct dans les salons
**Mode actuel : présence temps réel** (qui est là, qui prend la parole) via Supabase
Realtime — 100 % compatible **Expo Go**, aucun build natif requis.

Le **flux audio** lui-même viendra plus tard avec un SDK temps réel
([LiveKit](https://livekit.io) recommandé). ⚠️ Cette étape fait **sortir l'app d'Expo
Go** (dev build nécessaire) et demande un compte LiveKit Cloud (offre gratuite).
Point d'intégration prévu : `app/room/[id].tsx` (bouton micro + composant `MemberBubble`).

## Notes

- `Lingo` est un **nom de travail** : renomme librement dans `app.json` (`name`, `slug`, `scheme`, `bundleIdentifier`, `package`).
- Pour publier sur les stores, crée un projet EAS (`npx eas init`) et une URL publique pour la politique de confidentialité (`app/confidentialite.tsx`).
