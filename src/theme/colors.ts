/**
 * Palette de couleurs de "Wingo".
 * Identité : bleu vif Wingo en primaire, orange en accent, neutres clairs et
 * aérés (inspiration fintech premium type Revolut).
 *
 * NB : on conserve les anciens noms de tokens (encre, prune, ambre…) en alias
 * pour que tout l'app se re-skinne sans casser les imports existants.
 */
export const colors = {
  // --- Marque Wingo ---
  bleu: '#0A5CFF', // primaire
  bleuClair: '#4FA3FF',
  bleuFonce: '#083A9E',
  orange: '#FF8A3D', // accent
  orangeFonce: '#F2711C',
  vert: '#23C16B', // succès

  // --- Neutres ---
  fond: '#F4F6FB', // fond d'écran général
  carte: '#FFFFFF', // surfaces / cartes
  encre: '#0B1B3A', // texte principal (navy profond)
  encreDoux: '#14254A',
  texteGris: '#6B7A99', // texte secondaire
  texteClair: '#FFFFFF',
  texteSombre: '#0B1B3A',
  bordure: 'rgba(11, 27, 58, 0.08)',
  bordureClaire: 'rgba(255, 255, 255, 0.18)',
  overlay: 'rgba(11, 27, 58, 0.55)',

  // --- Alias rétro-compat (anciens noms) ---
  prune: '#0A5CFF', // = primaire (teinte active, liens)
  pruneDoux: '#3D7BFF',
  ambre: '#0A5CFF', // = primaire (boutons)
  corail: '#FF8A3D', // = accent orange
  creme: '#F4F6FB', // = fond
  cremeDoux: '#E9EEF9', // surfaces douces (avatars, chips)
  sauge: '#23C16B', // = succès vert
} as const;

export type ColorName = keyof typeof colors;

/**
 * Dégradés de la marque (utilisés en fond d'écrans héros et d'authentification).
 */
export const skyGradients = {
  aube: ['#4FA3FF', '#0A5CFF'],
  jour: ['#4FA3FF', '#0A5CFF'],
  crepuscule: ['#4FA3FF', '#0A5CFF'],
  nuit: ['#0A5CFF', '#083A9E'],
} as const;

export type SkyMoment = keyof typeof skyGradients;

/** Dégradé principal de la marque (bleu Wingo). */
export const wingoGradient = ['#0A5CFF', '#4FA3FF'] as const;

export function momentForHour(hour: number): SkyMoment {
  if (hour >= 5 && hour < 8) return 'aube';
  if (hour >= 8 && hour < 18) return 'jour';
  if (hour >= 18 && hour < 21) return 'crepuscule';
  return 'nuit';
}
