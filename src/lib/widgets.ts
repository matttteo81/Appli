import { Platform } from 'react-native';
import { ExtensionStorage } from '@bacons/apple-targets';

/**
 * Pont app → widgets iOS.
 * On écrit quelques valeurs dans l'« App Group » partagé, puis on demande
 * à iOS de rafraîchir les widgets. Sans module natif (Expo Go, build sans
 * widget), les appels sont des no-op : aucun risque de plantage.
 */
const APP_GROUP = 'group.com.app.fil.widgets';
const storage = new ExtensionStorage(APP_GROUP);

export function syncWidgets(data: {
  reunionDate?: string | null;
  reunionLabel?: string | null;
  togetherSince?: string | null;
  streak?: number | null;
}) {
  if (Platform.OS !== 'ios') return;
  try {
    storage.set('reunion_date', data.reunionDate ?? '');
    storage.set('reunion_label', data.reunionLabel ?? 'Retrouvailles');
    storage.set('together_since', data.togetherSince ?? '');
    storage.set('streak', typeof data.streak === 'number' ? data.streak : 0);
    ExtensionStorage.reloadWidget();
  } catch {
    // pas de widget disponible sur cet environnement : on ignore
  }
}
