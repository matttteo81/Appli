/**
 * Correctif : plantage natif au moment de la connexion (Expo SDK 57).
 *
 * Depuis Expo SDK 54+, `expo` remplace le `fetch` global par un fetch NATIF
 * (voir expo/src/winter/runtime.native.ts). Ce fetch natif attend des en-têtes
 * sous forme de paires de chaînes strictes (`[[string, string]]`). Si une
 * requête fournit un en-tête dont la valeur n'est pas une chaîne (nombre,
 * null/undefined) ou une structure d'en-têtes inhabituelle, la conversion
 * native échoue par une exception FATALE — que le `try/catch` JavaScript ne
 * peut PAS rattraper (RCTFatal → abort()). L'app se ferme alors brutalement.
 *
 * Supabase envoie ce type d'en-têtes lors de la requête d'authentification qui
 * suit immédiatement la connexion / création de compte : d'où le crash « l'app
 * se ferme quand on se connecte ». (À la réouverture, la session stockée est
 * réutilisée sans nouvelle requête d'auth, donc pas de crash.)
 *
 * On enveloppe donc le `fetch` global UNE fois pour normaliser les en-têtes en
 * paires de chaînes propres (valeurs converties en `String`, valeurs nulles
 * ignorées) avant de les transmettre au fetch natif. Aucun comportement réseau
 * n'est modifié — on nettoie seulement la forme des en-têtes.
 *
 * Ce module ne fait rien d'autre au chargement et doit être importé très tôt
 * (avant tout appel réseau) — voir app/_layout.tsx.
 */

type AnyHeaders = HeadersInit | Record<string, unknown> | null | undefined;

function cleanHeaders(h: AnyHeaders): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  try {
    if (typeof Headers !== 'undefined' && h instanceof Headers) {
      (h as Headers).forEach((value: string, key: string) => {
        if (value != null) out[key] = String(value);
      });
    } else if (Array.isArray(h)) {
      for (const pair of h as unknown[]) {
        if (Array.isArray(pair) && pair.length >= 2 && pair[1] != null) {
          out[String(pair[0])] = String(pair[1]);
        }
      }
    } else {
      for (const key of Object.keys(h as object)) {
        const value = (h as Record<string, unknown>)[key];
        if (value != null) out[key] = String(value);
      }
    }
  } catch {
    return {};
  }
  return out;
}

const g: any = globalThis;
const nativeFetch: typeof fetch | undefined = g.fetch;

if (typeof nativeFetch === 'function' && !(nativeFetch as any).__filSafe) {
  const safeFetch: any = (input: any, init?: any) => {
    if (init && init.headers) {
      init = { ...init, headers: cleanHeaders(init.headers) };
    }
    return nativeFetch(input, init);
  };
  safeFetch.__filSafe = true;
  try {
    g.fetch = safeFetch;
  } catch {
    // Si `fetch` n'est pas remplaçable (cas improbable), on laisse tel quel.
  }
}

export {};
