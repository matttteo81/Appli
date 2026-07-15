/** Sprites, tailles et logique de croissance de la ferme pixel-art. */
import type { ImageSourcePropType } from 'react-native';

export const HATCH_AT = 6; // éclosion
export const ADULT_AT = 30; // adulte (~15 jours à 2 nourrissages/jour)

type Sprite = { src: ImageSourcePropType; w: number; h: number };

export const SPRITES: Record<string, Sprite> = {
  egg: { src: require('../../assets/farm/egg.png'), w: 72, h: 78 },
  chick: { src: require('../../assets/farm/chick.png'), w: 84, h: 84 },
  hen: { src: require('../../assets/farm/hen.png'), w: 96, h: 96 },
  cat: { src: require('../../assets/farm/cat.png'), w: 96, h: 84 },
  dog: { src: require('../../assets/farm/dog.png'), w: 84, h: 54 },
  rabbit: { src: require('../../assets/farm/rabbit.png'), w: 84, h: 84 },
  pig: { src: require('../../assets/farm/pig.png'), w: 96, h: 72 },
};

export const SPECIES_NAMES: Record<string, string> = {
  hen: 'Poule',
  cat: 'Chat',
  dog: 'Chien',
  rabbit: 'Lapin',
  pig: 'Cochon',
};

/** Maison associée à une espèce (null = pas de maison, dort sur l'herbe). */
export function houseFor(species: string): 'coop' | 'doghouse' | 'cathouse' | null {
  if (species === 'hen') return 'coop';
  if (species === 'dog') return 'doghouse';
  if (species === 'cat') return 'cathouse';
  return null;
}

/** Sprite + échelle à afficher pour l'animal en cours d'élevage. */
export function activeDisplay(species: string, feeds: number): { sprite: Sprite; scale: number } {
  if (feeds < HATCH_AT) return { sprite: SPRITES.egg, scale: 0.9 };
  const s = SPRITES[species] ?? SPRITES.hen;
  if (feeds < 12) return { sprite: species === 'hen' ? SPRITES.chick : s, scale: 0.68 };
  if (feeds < 20) return { sprite: s, scale: 0.85 };
  return { sprite: s, scale: 1 };
}

export type Stage = {
  label: string;
  progress: number; // 0..1 vers le stade suivant
  hatched: boolean;
  days: number; // jour approximatif (feeds/2)
};

export function stageForFeeds(species: string, name: string | null, feeds: number): Stage {
  const nm = name || SPECIES_NAMES[species] || 'Petit';
  const days = Math.floor(feeds / 2);
  if (feeds < HATCH_AT) return { label: '🥚 Œuf', progress: feeds / HATCH_AT, hatched: false, days };
  if (feeds < 12)
    return { label: `🐣 ${nm} (bébé)`, progress: (feeds - HATCH_AT) / (12 - HATCH_AT), hatched: true, days };
  if (feeds < 20)
    return { label: `🐾 ${nm} (ado)`, progress: (feeds - 12) / 8, hatched: true, days };
  return { label: `🐾 ${nm}`, progress: (feeds - 20) / (ADULT_AT - 20), hatched: true, days };
}
