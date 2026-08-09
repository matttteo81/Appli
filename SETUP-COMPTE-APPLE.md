# 🍎 Bascule vers ton propre compte Apple Developer

Guide à suivre **le jour où tu as créé ton compte**. Objectif : passer sur **ton
compte**, sans rien perdre de tes données (elles sont dans Supabase, pas chez Apple).

> Option retenue : **A — repartir à neuf** sous ton compte. Nouveau bundle ID :
> **`com.app.fil`** (l'ancien `com.fil.couple` est resté verrouillé sur le compte
> de l'ami — Apple ne permet pas de le réutiliser ; c'est déjà géré dans le code).

---

## Étape 0 — Acheter le compte

- **Apple Developer Program**, version **Individual**, **99 $/an**
  → https://developer.apple.com/programs/
- (Ce n'est PAS un « compte créateur » : pour publier une app, c'est ce programme-là.)

## Étape 1 — Le nom technique (déjà réglé ✅)

L'ancien `com.fil.couple` est resté verrouillé sur le compte de l'ami (Apple ne
libère pas un identifiant déjà utilisé). On est donc passé à **`com.app.fil`**,
déjà appliqué partout dans le code. **Rien à faire de plus** — ton ami n'a plus
aucune manip à faire.

## Étape 2 — Récupérer ton Team ID

- developer.apple.com → **Membership** → copier le **Team ID** (10 caractères).
- 👉 **À me donner.** Je l'ajoute dans `app.json` :
  ```json
  "ios": {
    "appleTeamId": "XXXXXXXXXX",
    "bundleIdentifier": "com.app.fil",
    ...
  }
  ```
  (Requis pour signer les **widgets**.)

## Étape 3 — Créer une clé API App Store Connect

- App Store Connect → **Users and Access** → **Integrations / Keys** →
  **App Store Connect API** → générer une clé (rôle **App Manager** ou **Admin**).
- Tu obtiens : un fichier **`.p8`** (téléchargeable **une seule fois**), un
  **Key ID**, un **Issuer ID**.
- 👉 **À me donner** (les 3). Je mets à jour `eas.json` → `submit.production.ios` :
  | Champ | Valeur actuelle (ami) | Nouvelle (toi) |
  |---|---|---|
  | `ascAppId` | `6790730066` | **nouvel ID** (créé à l'étape 5) |
  | `ascApiKeyId` | `7584B8B9RS` | **ton Key ID** |
  | `ascApiKeyIssuerId` | `0f05567b-…` | **ton Issuer ID** |
  | `ascApiKeyPath` | `./asc-key.p8` | remplacer le fichier `.p8` |

## Étape 4 — EAS régénère les identifiants tout seul

- Rien à copier à la main : au premier build sous ton compte, EAS crée
  **certificats + profils** et enregistre l'**App Group**
  `group.com.app.fil.widgets` + l'app ID des widgets.
- Au besoin : `eas credentials` pour vérifier.

## Étape 5 — Créer l'app + builder + envoyer

1. App Store Connect → **+ New App** → bundle ID `com.app.fil` → récupérer son
   **ascAppId** (à mettre dans `eas.json`, étape 3).
2. Build : `eas build -p ios --profile production`
3. Envoi TestFlight : `eas submit -p ios --profile production`

## Étape 6 — Réinstaller + ré-ajouter les testeuses

- Sur ton iPhone : installer la nouvelle version depuis TestFlight.
- App Store Connect → TestFlight → ajouter **toi** + **ta partenaire** comme testeurs.
- Vous vous reconnectez → **toutes vos données Supabase sont là** (couple, photos,
  messages, série, ferme, souvenirs…). Rien n'a bougé.

---

## ✅ Ce que tu NE perds pas
- **Toutes tes données** (Supabase) — intactes.
- **Le code, Expo/EAS, l'historique de dev** — intacts.

## ↩️ Ce qui repart de zéro (sans impact réel)
- Les **builds de test actuels** (chez ton ami) → tu réinstalles une fois.
- La **liste des testeurs** → 2 min pour re-ajouter.
- La **numérotation des builds** → repart à #1.

---

## 📄 Infos publication déjà prêtes
- **Politique de confidentialité (URL publique)** :
  https://classy-lollipop-8f7a84.netlify.app
- **E-mail de support** : support.application1@gmail.com

## 🔖 Ce dont j'ai besoin de toi (résumé)
1. **Team ID** (étape 2)
2. **Clé API** : fichier `.p8` + **Key ID** + **Issuer ID** (étape 3)
3. (Le nom technique `com.app.fil` est déjà en place — plus rien côté ami)

Dès que tu as ces 3 choses, je fais les mises à jour de config et on build sous
**ton** compte, widgets signés compris.
