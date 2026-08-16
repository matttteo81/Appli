import { Platform } from 'react-native';

/**
 * Pont app → widgets iOS.
 * On écrit quelques valeurs dans l'« App Group » partagé, puis on demande à
 * iOS de rafraîchir les widgets.
 *
 * IMPORTANT : rien de natif ne s'exécute au chargement du module. Tout est
 * chargé à la demande et protégé (try/catch). Si le module widget n'est pas
 * présent dans le build, c'est un simple no-op — aucun risque de plantage.
 */
const APP_GROUP = 'group.com.matteo81.fil.widgets';

export type WidgetData = {
  // Compte à rebours (prochain à venir) + jours ensemble + série.
  reunionDate?: string | null;
  reunionLabel?: string | null;
  togetherSince?: string | null;
  streak?: number | null;
  // Partenaire : heure/météo/localisation + humeur.
  partnerName?: string | null;
  partnerCity?: string | null;
  partnerTimezone?: string | null;
  partnerWeatherEmoji?: string | null;
  partnerTemp?: string | null;
  partnerWeatherLabel?: string | null;
  partnerMoodEmoji?: string | null;
  partnerMoodLabel?: string | null;
};

export function syncWidgets(data: WidgetData) {
  if (Platform.OS !== 'ios') return;
  try {
    // Chargé seulement ici (pas au démarrage) et protégé.
    const { ExtensionStorage } = require('@bacons/apple-targets');
    const storage = new ExtensionStorage(APP_GROUP);
    const s = (k: string, v?: string | null) => storage.set(k, v ?? '');

    s('reunion_date', data.reunionDate);
    s('reunion_label', data.reunionLabel ?? 'Retrouvailles');
    s('together_since', data.togetherSince);
    storage.set('streak', typeof data.streak === 'number' ? data.streak : 0);

    s('partner_name', data.partnerName);
    s('partner_city', data.partnerCity);
    s('partner_timezone', data.partnerTimezone);
    s('partner_weather_emoji', data.partnerWeatherEmoji);
    s('partner_temp', data.partnerTemp);
    s('partner_weather_label', data.partnerWeatherLabel);
    s('partner_mood_emoji', data.partnerMoodEmoji);
    s('partner_mood_label', data.partnerMoodLabel);

    ExtensionStorage.reloadWidget();
  } catch {
    // Pas de widget dans ce build : on ignore silencieusement.
  }
}

/**
 * Widgets « média » (asynchrones) : dernière photo partagée (vignette) et
 * dessin libre partagé (traits vectoriels, dessinés nativement par le widget).
 * Tout est protégé : en cas d'échec, le widget affiche juste un état vide.
 */
export async function syncMediaWidgets(coupleId?: string | null) {
  if (Platform.OS !== 'ios' || !coupleId) return;
  let storage: any;
  try {
    const { ExtensionStorage } = require('@bacons/apple-targets');
    storage = new ExtensionStorage(APP_GROUP);
  } catch {
    return; // pas de widget dans ce build
  }
  const { supabase } = require('./supabase');

  // 1) Dernière photo → vignette base64
  try {
    const { data: ph } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ph?.storage_path) {
      const { data: signed } = await supabase.storage
        .from('photos')
        .createSignedUrl(ph.storage_path, 60 * 60);
      if (signed?.signedUrl) {
        const ImageManipulator = require('expo-image-manipulator');
        const out = await ImageManipulator.manipulateAsync(
          signed.signedUrl,
          [{ resize: { width: 600 } }],
          { compress: 0.6, base64: true, format: ImageManipulator.SaveFormat.JPEG },
        );
        if (out?.base64) storage.set('photo_b64', out.base64);
      }
    }
  } catch {
    // on garde l'ancienne vignette
  }

  // 2) Dessin libre → JSON compact de traits (dessinés par le widget)
  try {
    const { data: strokes } = await supabase
      .from('drawing_strokes')
      .select('color,width,points')
      .eq('couple_id', coupleId)
      .eq('board', 'free')
      .order('created_at', { ascending: true })
      .limit(300);
    const r = (n: number) => Math.round(n * 1000) / 1000; // 3 décimales
    const compact = (strokes ?? []).map((s: any) => ({
      c: s.color,
      w: s.width,
      p: (s.points ?? []).map((pt: number[]) => [r(pt[0]), r(pt[1])]),
    }));
    storage.set('drawing_json', JSON.stringify(compact));
  } catch {
    // on garde l'ancien dessin
  }

  try {
    const { ExtensionStorage } = require('@bacons/apple-targets');
    ExtensionStorage.reloadWidget();
  } catch {}
}
