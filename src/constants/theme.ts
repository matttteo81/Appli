/**
 * Système de design de « Fil ».
 *
 * Ici on centralise TOUT ce qui touche à l'apparence : les couleurs, les
 * espacements, les arrondis et les noms des polices. En important toujours
 * depuis ce fichier, on garde une apparence cohérente dans toute l'app.
 */
import { Platform } from 'react-native';

/** La palette de « Fil » (voir le cahier des charges). */
export const Palette = {
  encre: '#1B1B3A', // Indigo encre — texte principal, nuit
  prune: '#4A3B6B', // Prune crépuscule — surfaces sombres
  ambre: '#F2A65A', // Ambre — accent principal (boutons)
  corail: '#EF8C7C', // Corail — accent secondaire (le cœur)
  creme: '#FBF6EF', // Crème nuage — fond clair
  sauge: '#A8C3A0', // Vert sauge — progression / succès
  // Quelques nuances dérivées, utiles pour les détails :
  cremeSombre: '#F1E9DC',
  encreDoux: '#3A3A5C',
  brume: '#8C88A8',
  blanc: '#FFFFFF',
} as const;

/**
 * Les couleurs « sémantiques » : on les nomme par leur rôle plutôt que par
 * leur teinte, pour pouvoir changer d'avis plus tard sans tout casser.
 */
export const Colors = {
  background: Palette.creme,
  surface: Palette.blanc,
  surfaceSunk: Palette.cremeSombre,
  text: Palette.encre,
  textSecondary: Palette.encreDoux,
  textMuted: Palette.brume,
  primary: Palette.ambre,
  onPrimary: Palette.encre,
  secondary: Palette.corail,
  success: Palette.sauge,
  border: '#E7DECF',
  night: Palette.encre,
  dusk: Palette.prune,
} as const;

/** Espacements — on utilise une petite échelle pour rester cohérent. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Arrondis des coins. */
export const Radius = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

/**
 * Noms des polices Google (chargées dans src/app/_layout.tsx).
 * - serif  : titres chaleureux (Fraunces)
 * - sans   : texte courant (Plus Jakarta Sans)
 * - mono   : heures et compte à rebours (IBM Plex Mono)
 * Sur le web on retombe sur des polices système équivalentes.
 */
export const Fonts = Platform.select({
  default: {
    serif: 'Fraunces_600SemiBold',
    serifBold: 'Fraunces_700Bold',
    sans: 'PlusJakartaSans_400Regular',
    sansMedium: 'PlusJakartaSans_500Medium',
    sansSemiBold: 'PlusJakartaSans_600SemiBold',
    sansBold: 'PlusJakartaSans_700Bold',
    mono: 'IBMPlexMono_400Regular',
    monoMedium: 'IBMPlexMono_500Medium',
  },
  web: {
    serif: 'Georgia, serif',
    serifBold: 'Georgia, serif',
    sans: 'system-ui, sans-serif',
    sansMedium: 'system-ui, sans-serif',
    sansSemiBold: 'system-ui, sans-serif',
    sansBold: 'system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
    monoMedium: 'ui-monospace, monospace',
  },
})!;

/** Ombre douce réutilisable pour les cartes. */
export const softShadow = {
  shadowColor: Palette.encre,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
} as const;
