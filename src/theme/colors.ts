/**
 * Palette de couleurs de "Wingo".
 * Chaque couleur a un nom évocateur pour rester fidèle à l'ambiance chaleureuse.
 */
export const colors = {
  encre: '#1B1B3A', // Indigo encre — fonds sombres, texte sur clair
  prune: '#4A3B6B', // Prune crépuscule — surfaces secondaires
  ambre: '#F2A65A', // Ambre — accent principal
  corail: '#EF8C7C', // Corail — accent secondaire
  creme: '#FBF6EF', // Crème nuage — fond clair
  sauge: '#A8C3A0', // Vert sauge — progression / succès

  // Nuances utilitaires dérivées
  encreDoux: '#2A2A4E',
  pruneDoux: '#5C4B80',
  cremeDoux: '#F3ECE1',
  texteClair: '#FBF6EF',
  texteSombre: '#1B1B3A',
  texteGris: '#6E6A7C',
  bordure: 'rgba(27, 27, 58, 0.12)',
  bordureClaire: 'rgba(251, 246, 239, 0.16)',
  overlay: 'rgba(27, 27, 58, 0.55)',
} as const;

export type ColorName = keyof typeof colors;

/**
 * Dégradés du "ciel jumeau" selon le moment de la journée.
 * On choisit le dégradé à partir de l'heure locale de chaque partenaire.
 */
export const skyGradients = {
  aube: ['#4A3B6B', '#EF8C7C', '#F2A65A'], // crépuscule/aube rosé
  jour: ['#7FB0E0', '#A9CDEA', '#FBF6EF'], // ciel bleu clair
  crepuscule: ['#F2A65A', '#EF8C7C', '#4A3B6B'], // coucher ambré
  nuit: ['#1B1B3A', '#2A2A4E', '#4A3B6B'], // nuit étoilée
} as const;

export type SkyMoment = keyof typeof skyGradients;

/**
 * Détermine le moment du ciel à partir d'une heure (0-23).
 */
export function momentForHour(hour: number): SkyMoment {
  if (hour >= 5 && hour < 8) return 'aube';
  if (hour >= 8 && hour < 18) return 'jour';
  if (hour >= 18 && hour < 21) return 'crepuscule';
  return 'nuit';
}
