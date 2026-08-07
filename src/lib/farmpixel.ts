/** Sprites (avec variantes de couleur), tailles et croissance de la ferme. */
import type { ImageSourcePropType } from 'react-native';

export const HATCH_AT = 6; // éclosion
export const ADULT_AT = 30; // adulte (~15 jours à 2 nourrissages/jour)

export type Unlock = {
  species: string;
  label: string;
  emoji: string;
  unlocked: boolean;
  condition: string;
};

/** Espèces débloquées selon la série et les jours ensemble du couple. */
export function speciesUnlocks(streak: number, daysTogether: number): Unlock[] {
  return [
    { species: 'hen', label: 'Poule', emoji: '🐔', unlocked: true, condition: 'Dès le début' },
    { species: 'pig', label: 'Cochon', emoji: '🐷', unlocked: true, condition: 'Dès le début' },
    { species: 'rabbit', label: 'Lapin', emoji: '🐰', unlocked: streak >= 7, condition: '7 jours d’affilée 🔥' },
    { species: 'dog', label: 'Chien', emoji: '🐶', unlocked: streak >= 30, condition: '30 jours d’affilée 🔥' },
    { species: 'cat', label: 'Chat', emoji: '🐱', unlocked: daysTogether >= 100, condition: '100 jours ensemble 💞' },
  ];
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** Saison de l'hémisphère nord (France & Chine) d'après le mois. */
export function seasonNow(d = new Date()): Season {
  const m = d.getMonth(); // 0 = janvier
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export type Sprite = { src: ImageSourcePropType; w: number; h: number };

const EGG: Sprite = { src: require('../../assets/farm/egg.png'), w: 72, h: 78 };
const CHICK: Sprite = { src: require('../../assets/farm/chick.png'), w: 84, h: 84 };

// Une image par couleur de pelage.
const ADULTS: Record<string, { srcs: ImageSourcePropType[]; w: number; h: number }> = {
  hen: {
    w: 96, h: 96,
    srcs: [
      require('../../assets/farm/hen_0.png'),
      require('../../assets/farm/hen_1.png'),
      require('../../assets/farm/hen_2.png'),
      require('../../assets/farm/hen_3.png'),
      require('../../assets/farm/hen_4.png'),
    ],
  },
  cat: {
    w: 96, h: 96,
    srcs: [
      require('../../assets/farm/cat_0.png'),
      require('../../assets/farm/cat_1.png'),
      require('../../assets/farm/cat_2.png'),
      require('../../assets/farm/cat_3.png'),
      require('../../assets/farm/cat_4.png'),
    ],
  },
  dog: {
    w: 96, h: 96,
    srcs: [
      require('../../assets/farm/dog_0.png'),
      require('../../assets/farm/dog_1.png'),
      require('../../assets/farm/dog_2.png'),
      require('../../assets/farm/dog_3.png'),
      require('../../assets/farm/dog_4.png'),
      require('../../assets/farm/dog_5.png'),
    ],
  },
  rabbit: {
    w: 84, h: 84,
    srcs: [
      require('../../assets/farm/rabbit_0.png'),
      require('../../assets/farm/rabbit_1.png'),
      require('../../assets/farm/rabbit_2.png'),
      require('../../assets/farm/rabbit_3.png'),
      require('../../assets/farm/rabbit_4.png'),
    ],
  },
  pig: {
    w: 96, h: 72,
    srcs: [
      require('../../assets/farm/pig_0.png'),
      require('../../assets/farm/pig_1.png'),
      require('../../assets/farm/pig_2.png'),
      require('../../assets/farm/pig_3.png'),
    ],
  },
};

export const SPECIES_NAMES: Record<string, string> = {
  hen: 'Poule', cat: 'Chat', dog: 'Chien', rabbit: 'Lapin', pig: 'Cochon',
};

/** Nombre de couleurs disponibles pour une espèce. */
export function colorCount(species: string): number {
  return ADULTS[species]?.srcs.length ?? 1;
}

/** Sprite (adulte) d'une espèce dans une couleur donnée. */
export function residentSprite(species: string, color: number): Sprite {
  const a = ADULTS[species] ?? ADULTS.hen;
  const idx = ((color % a.srcs.length) + a.srcs.length) % a.srcs.length;
  return { src: a.srcs[idx], w: a.w, h: a.h };
}

/** Maison associée à une espèce (null = pas de maison). */
export function houseFor(species: string): 'coop' | 'doghouse' | 'cathouse' | null {
  if (species === 'hen') return 'coop';
  if (species === 'dog') return 'doghouse';
  if (species === 'cat') return 'cathouse';
  return null;
}

/** Sprite + échelle de l'animal en cours d'élevage. */
export function activeDisplay(
  species: string,
  color: number,
  feeds: number,
): { sprite: Sprite; scale: number } {
  if (feeds < HATCH_AT) return { sprite: EGG, scale: 0.9 };
  const adult = residentSprite(species, color);
  if (feeds < 12) return { sprite: species === 'hen' ? CHICK : adult, scale: 0.68 };
  if (feeds < 20) return { sprite: adult, scale: 0.85 };
  return { sprite: adult, scale: 1 };
}

export type Stage = { label: string; progress: number; hatched: boolean; days: number };

export function stageForFeeds(species: string, name: string | null, feeds: number): Stage {
  const nm = name || SPECIES_NAMES[species] || 'Petit';
  const days = Math.floor(feeds / 2);
  if (feeds < HATCH_AT) return { label: '🥚 Œuf', progress: feeds / HATCH_AT, hatched: false, days };
  if (feeds < 12) return { label: `🐣 ${nm} (bébé)`, progress: (feeds - HATCH_AT) / (12 - HATCH_AT), hatched: true, days };
  if (feeds < 20) return { label: `🐾 ${nm} (ado)`, progress: (feeds - 12) / 8, hatched: true, days };
  return { label: `🐾 ${nm}`, progress: (feeds - 20) / (ADULT_AT - 20), hatched: true, days };
}
