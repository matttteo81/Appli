/**
 * Correctif : plantage natif au moment de la connexion (Expo SDK 57).
 *
 * Depuis Expo SDK 54+, `expo` remplace le `fetch` global par un fetch NATIF
 * (voir expo/src/winter/runtime.native.ts). Ce fetch natif attend des en-têtes
 * sous forme de paires de chaînes strictes (`[[string, string]]`). Si une
 * requête fournit un en-tête dont la valeur n'est pas une chaîne (nombre,
 * null/undefined, objet…) ou une structure d'en-têtes inhabituelle, la
 * conversion native échoue par une exception FATALE — que le `try/catch`
 * JavaScript ne peut PAS rattraper (RCTFatal → abort()). L'app se ferme.
 *
 * Supabase envoie ce type d'en-têtes lors de la requête d'authentification qui
 * suit immédiatement la connexion → d'où le crash « l'app se ferme quand on se
 * connecte ». (À la réouverture, la session stockée est réutilisée sans
 * nouvelle requête d'auth, donc pas de crash.)
 *
 * On expose `safeFetch`, qui NORMALISE les en-têtes en un objet de chaînes
 * propres avant de déléguer au fetch natif. On l'utilise :
 *   1. explicitement pour le client Supabase (voir supabase.ts) — c'est la
 *      protection principale, elle ne dépend d'aucun ordre de chargement ;
 *   2. en repli, on remplace aussi le `fetch` global, pour couvrir tous les
 *      autres appels réseau.
 */

type AnyHeaders = HeadersInit | Record<string, unknown> | null | undefined;

/** Transforme n'importe quelle forme d'en-têtes en objet { clé: chaîne }. */
function cleanHeaders(h: AnyHeaders): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  try {
    if (typeof Headers !== 'undefined' && h instanceof Headers) {
      (h as Headers).forEach((value: string, key: string) => {
        if (value != null) out[String(key)] = String(value);
      });
    } else if (Array.isArray(h)) {
      for (const pair of h as unknown[]) {
        if (Array.isArray(pair) && pair.length >= 1) {
          const [k, v] = pair as unknown[];
          if (k != null && v != null) out[String(k)] = String(v);
        }
      }
    } else {
      for (const key of Object.keys(h as object)) {
        const value = (h as Record<string, unknown>)[key];
        if (value != null) out[String(key)] = String(value);
      }
    }
  } catch {
    return {};
  }
  return out;
}

const g: any = globalThis;

/**
 * Filet de sécurité GLOBAL contre les crashs.
 *
 * En production, une erreur JavaScript non rattrapée fait FERMER l'app : React
 * Native appelle son gestionnaire fatal → RCTFatal → abort(). Or plusieurs
 * appels asynchrones au démarrage / à la connexion ne sont pas protégés (ex.
 * un rafraîchissement de session déclenché en arrière-plan). Une simple erreur
 * réseau y devenait donc FATALE → « l'app se ferme quand on se connecte ».
 *
 * On remplace le gestionnaire global par un gestionnaire qui journalise mais ne
 * fait PAS planter l'app : mieux vaut un état momentanément dégradé (qui se
 * répare au rafraîchissement suivant) qu'une fermeture brutale.
 */
try {
  const EU: any = g.ErrorUtils;
  if (EU && typeof EU.setGlobalHandler === 'function' && !EU.__filHandler) {
    EU.setGlobalHandler((error: any, isFatal?: boolean) => {
      try {
        // eslint-disable-next-line no-console
        console.error('[Fil] erreur JS non rattrapée (ignorée) :', !!isFatal, error?.message ?? error);
      } catch {}
      // On ne relance PAS le comportement par défaut (qui ferait abort()).
    });
    EU.__filHandler = true;
  }
} catch {
  // ErrorUtils indisponible : on ne fait rien.
}

// Référence au fetch en place AVANT notre remplacement (le fetch natif d'Expo).
const baseFetch: typeof fetch =
  (g.fetch && (g.fetch as any).__filBase) || g.fetch;

/**
 * fetch sécurisé : nettoie les en-têtes puis délègue au fetch natif.
 * Aucun autre comportement réseau n'est modifié.
 */
export const safeFetch: typeof fetch = (input: any, init?: any) => {
  if (init && init.headers) {
    init = { ...init, headers: cleanHeaders(init.headers) };
  }
  return baseFetch(input, init);
};
(safeFetch as any).__filSafe = true;

// Repli : on remplace aussi le fetch global (couvre les appels hors Supabase).
if (typeof baseFetch === 'function' && !(g.fetch as any)?.__filSafe) {
  try {
    (safeFetch as any).__filBase = baseFetch;
    g.fetch = safeFetch;
  } catch {
    // Si `fetch` n'est pas remplaçable (cas improbable), on garde au moins
    // la protection explicite de Supabase.
  }
}
