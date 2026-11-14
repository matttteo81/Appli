import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Barre d'onglets flottante (pilule translucide, façon iOS récent).
 *
 * Elle est posée PAR-DESSUS le contenu : les écrans défilent dessous. Tout ce
 * qui est ancré en bas d'un écran à onglets (champ de message, bouton
 * « Ajouter »…) doit donc se décaler de `useTabBarSpace()`.
 */
export const TAB_BAR_HEIGHT = 56;
export const TAB_BAR_MARGIN = 14;

/** Distance entre le bas de l'écran et le bas de la barre. */
export function useTabBarBottom(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom - 10, 12);
}

/** Hauteur totale occupée par la barre depuis le bas de l'écran. */
export function useTabBarSpace(): number {
  return useTabBarBottom() + TAB_BAR_HEIGHT + 8;
}
