import { supabase } from './supabase';

/**
 * Traduit un texte via l'Edge Function Supabase `translate`.
 * (Voir supabase/functions/translate/index.ts — à déployer avec une clé
 * de fournisseur de traduction dans les secrets Supabase.)
 *
 * Renvoie `null` si la fonction n'est pas déployée / échoue, pour que
 * l'interface affiche un message doux plutôt que de planter.
 */
export async function translateText(
  text: string,
  target: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('translate', {
      body: { text, target },
    });
    if (error) return null;
    const out = (data as { translation?: string })?.translation;
    return out ?? null;
  } catch {
    return null;
  }
}
