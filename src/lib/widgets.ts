import { Platform } from 'react-native';

/**
 * Pont app → widgets iOS.
 * On écrit quelques valeurs dans l'« App Group » partagé, puis on demande à
 * iOS de rafraîchir les widgets.
 *
 * IMPORTANT : rien de natif ne s'exécute au chargement du module. Tout est
 * chargé à la demande et protégé (try/catch). Si le module widget n'est pas
 * présent dans le build (comme le 1er build, sans widget), c'est un simple
 * no-op — aucun risque de plantage au démarrage.
 */
const APP_GROUP = 'group.com.matteo81.fil.widgets';

export function syncWidgets(data: {
  reunionDate?: string | null;
  reunionLabel?: string | null;
  togetherSince?: string | null;
  streak?: number | null;
}) {
  if (Platform.OS !== 'ios') return;
  try {
    // Chargé seulement ici (pas au démarrage) et protégé.
    const { ExtensionStorage } = require('@bacons/apple-targets');
    const storage = new ExtensionStorage(APP_GROUP);
    storage.set('reunion_date', data.reunionDate ?? '');
    storage.set('reunion_label', data.reunionLabel ?? 'Retrouvailles');
    storage.set('together_since', data.togetherSince ?? '');
    storage.set('streak', typeof data.streak === 'number' ? data.streak : 0);
    ExtensionStorage.reloadWidget();
  } catch {
    // Pas de widget dans ce build : on ignore silencieusement.
  }
}
