/**
 * GIF animés prédéfinis, embarqués dans l'appli (donc dispo partout, même
 * en Chine, sans service externe). On les référence par un id `builtin:<id>`.
 */
import type { ImageSourcePropType } from 'react-native';

export const BUILTIN_GIFS: { id: string; label: string; source: ImageSourcePropType }[] = [
  { id: 'coeur-bat', label: 'Cœur qui bat', source: require('../../assets/gifs/coeur-bat.gif') },
  { id: 'pluie-coeurs', label: 'Pluie de cœurs', source: require('../../assets/gifs/pluie-coeurs.gif') },
  { id: 'deux-coeurs', label: 'Deux cœurs', source: require('../../assets/gifs/deux-coeurs.gif') },
  { id: 'explosion-coeurs', label: 'Explosion', source: require('../../assets/gifs/explosion-coeurs.gif') },
  { id: 'coeur-arc', label: 'Arc-en-ciel', source: require('../../assets/gifs/coeur-arc.gif') },
  { id: 'bonne-nuit', label: 'Bonne nuit', source: require('../../assets/gifs/bonne-nuit.gif') },
];

const BUILTIN_MAP: Record<string, ImageSourcePropType> = Object.fromEntries(
  BUILTIN_GIFS.map((g) => [g.id, g.source]),
);

/** Renvoie la source d'affichage pour un champ image_url de message. */
export function gifSource(imageUrl: string): ImageSourcePropType | null {
  if (imageUrl.startsWith('builtin:')) {
    return BUILTIN_MAP[imageUrl.slice('builtin:'.length)] ?? null;
  }
  return { uri: imageUrl };
}
