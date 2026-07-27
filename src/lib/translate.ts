import { supabase } from './supabase';

/**
 * Traduction des messages.
 *
 * Aujourd'hui : MyMemory (gratuit, sans clé) appelé directement.
 * Plus tard (Azure, meilleure qualité) : passe `USE_EDGE_FN` à `true` une fois
 * la fonction serveur `translate` déployée avec la clé Azure. Rien d'autre ne
 * change côté app — la clé reste côté serveur, jamais dans l'app.
 */
const USE_EDGE_FN = false;

/** Langue de lecture = langue de l'appareil (via Intl, intégré à Hermes). */
export function readerLang(): string {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale; // ex. « fr-FR »
    return (loc.split('-')[0] || 'fr').toLowerCase();
  } catch {
    return 'fr';
  }
}

/** Détection simple : caractères chinois → « zh », sinon « fr ». */
export function detectLang(text: string): string {
  if (/[㐀-䶿一-鿿豈-﫿]/.test(text)) return 'zh';
  return 'fr';
}

const cache = new Map<string, string>();

async function viaMyMemory(text: string, target: string, source: string): Promise<string | null> {
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text) +
    `&langpair=${source}|${target}`;
  const res = await fetch(url);
  const json: any = await res.json();
  const out = json?.responseData?.translatedText;
  return typeof out === 'string' && out.trim() ? out : null;
}

async function viaEdge(text: string, target: string, source: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('translate', {
    body: { text, to: target, from: source },
  });
  if (error) return null;
  const out = (data as any)?.translated;
  return typeof out === 'string' && out.trim() ? out : null;
}

/**
 * Traduit `text` vers `target`. Renvoie null si la source == cible ou en cas
 * d'échec. Les résultats sont mis en cache pour ne pas retraduire deux fois.
 */
export async function translateText(
  text: string,
  target: string,
  source?: string,
): Promise<string | null> {
  const src = source ?? detectLang(text);
  if (src === target) return null;
  const key = `${src}|${target}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const out = USE_EDGE_FN
      ? await viaEdge(text, target, src)
      : await viaMyMemory(text, target, src);
    if (out) cache.set(key, out);
    return out;
  } catch {
    return null;
  }
}
