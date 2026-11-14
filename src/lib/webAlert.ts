import { Alert, Platform } from 'react-native';

/**
 * Sur le web, `Alert.alert` de React Native ne fait RIEN (aucune fenêtre, aucun
 * bouton appelé) : toutes les confirmations de l'app (« Supprimer ? »…)
 * restaient donc sans effet dans l'aperçu navigateur.
 *
 * Ici on le remplace, sur le web uniquement, par les boîtes de dialogue du
 * navigateur. Sur iPhone/Android, rien ne change.
 */
type Btn = { text?: string; style?: string; onPress?: () => void };

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  (Alert as any).alert = (title?: string, message?: string, buttons?: Btn[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];
    const cancel = list.find((b) => b.style === 'cancel');
    const actions = list.filter((b) => b.style !== 'cancel');

    // Simple information (0 ou 1 bouton, sans « Annuler »).
    if (actions.length <= 1 && !cancel) {
      window.alert(text);
      actions[0]?.onPress?.();
      return;
    }
    // Confirmation classique : Annuler / une action.
    if (actions.length === 1) {
      if (window.confirm(text)) actions[0].onPress?.();
      else cancel?.onPress?.();
      return;
    }
    // Plusieurs actions : on les propose une à une, la première acceptée gagne.
    for (const b of actions) {
      if (window.confirm(`${text}\n\n→ ${b.text ?? 'Continuer'} ?`)) {
        b.onPress?.();
        return;
      }
    }
    cancel?.onPress?.();
  };
}
