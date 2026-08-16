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
